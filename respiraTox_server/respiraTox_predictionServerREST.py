import os,os.path
import sys
import subprocess
import threading
import json
import time

from flask import Flask
from flask_cors import CORS
from flask_restful import Api,Resource, reqparse
from pprint import pprint
from optparse import OptionParser

# debug timer threads - recursion error
recursionCount = 0

# import openbabel python module for SMILES to MOL convertion
openbabel = False
try:
    import pybel
    openbabel = True
except:
    pass

debug       = False

# # internal variable - ugly as global
# job_timeout = 600


def saveGetDefault(the_hash,the_key,the_default=None):
    try:
        return the_hash[the_key]
    except:
        return the_default

class STATUS(object):
    status_hash = {}
    debug = False

    def __setattr__(self, status_name,status_value):
        try:
            self.status_hash[status_name]
        except:
            status_code = len(self.status_hash)
            self.status_hash[status_name] = (status_code,status_value)
            pass
    def __getattr__(self, status_name):
        if self.debug:
            print('STATUS-Debug (__getattr__): {status_name}')
        try:
            self.status_hash[status_name]
        except Exception as e:
            raise e
        return self.status_hash[status_name]

STATUS = STATUS()
STATUS.OK               = 'OK'
STATUS.PROCESSING       = 'Processing'
STATUS.FINISHED         = 'Finished'
STATUS.JOBFILE_CREATION_START   = 'Setting up the job file started'
STATUS.JOBFILE_CREATION_END     = 'Setting up the job file finished'
STATUS.JOBFILE_CREATION_ERROR   = 'Setting up the job file resulted in an error'
STATUS.OUTFILE_CREATION_ERROR   = 'Creating the output file resulted in an error'
STATUS.OUTFILE_DELETION_ERROR   = 'Deleting the output file resulted in an error'
STATUS.RUN_JOB                  = 'Run job'
STATUS.RUN_JOB_START            = 'Run job started'
STATUS.RUN_JOB_PROCESSING       = 'Run job in process'
STATUS.RUN_JOB_END              = 'Run job finished'
STATUS.RUN_JOB_ERROR            = 'Run job error occurred (Runtime Error)'
STATUS.RUN_JOB_QUEUED           = 'Run job queued'
STATUS.COLLECTING_JOB           = 'Collecting job results'
STATUS.COLLECTING_JOB_DATA      = 'Collecting job results (data loaded)'
STATUS.COLLECTING_JOB_ERROR     = 'Collecting job resulted in an error'
STATUS.COLLECTING_JOB_ERROR_FNF = 'Collecting job resulted in an error (file did not exists)'

STATUS_ERRORS = [
    STATUS.JOBFILE_CREATION_ERROR,
    STATUS.OUTFILE_CREATION_ERROR,
    STATUS.RUN_JOB_ERROR,
    STATUS.COLLECTING_JOB_ERROR,
    STATUS.COLLECTING_JOB_ERROR_FNF,
    STATUS.OUTFILE_DELETION_ERROR,
]

knime_workflow_error_codes = {
    '001':'No smiles supplied',
    '002':'RDKit Parsing/Sanitization Error',
    '003':'Uncertain structure Error (contains *)',
    '004':'Element Error (inorganic compound?) contains metal, please test in different model',
    '005':'Inorganic compounds are out of AD, please test in different model',
    '006':'Multi constituent please do not enter disconnected structures at this time (execpt: [Na+].* & co.)',
     }
    
# settings = {
#     'port':5555,
#     'IP':'127.0.0.1',
#     'knime':{
#         'application':'/Applications/KNIME 3.5.2.app/Contents/MacOS/Knime',
#         'default_parameters':['-reset', '-nosplash', '-application', '-consoleLog', 'org.knime.product.KNIME_BATCH_APPLICATION'],
#         'workflow_name':'knime_respiraTox_predict_json',
#         'model_name':'CURRENTLY-NOT-USED',
#         'workflow_dir':'/Users/karwath/knime-workspace',
#         'json_dir':'respiraTox_predict_json',
#         'infile_name_stem':'Compound_{}_in.json',
#         'outfile_name_stem':'Compound_{}_out.json'
#         }
#     }
    
settings = None

# new job queue issues
global_job_queue           = None
global_job_queue_intervall = 2     # in seconds
global_job_process_thread  = None


compounds = [
    {
        "job_id":"1",
        "compound_id":"J1",
        "compound_structure_smiles":"CC(=O)C1=CC=CC=C1",
        "Prediction (endpoint)":"",
        "status":"preset",
        "thread":None
    },
    {
        "job_id":"2",
        "compound_id":"J2",
        "compound_structure_smiles":"CC(=C)C1=CC=CC=C1",
        "Prediction (endpoint)":"",
        "status":"preset",
        "thread":None        
    },
    {
        "job_id": "3",
        "compound_id": "22",
        "compound_structure_smiles": "c1ccccc1CCc2ccccc2",
        "Prediction (endpoint)": "1",
        "status":"preset",
        "thread":None,        
        "calculated_data": {
            "compound_cas_number": "22",
            "Molecule (RDKit Mol)": "C(Cc1ccccc1)c1ccccc1",
            "SlogP": 3.4718000000000018,
            "SMR": 60.29200000000004,
            "LabuteASA": 85.21838155435421,
            "TPSA": 0.0,
            "AMW": 182.266,
            "ExactMW": 182.109550448,
            "NumLipinskiHBA": 0,
            "NumLipinskiHBD": 0,
            "NumRotatableBonds": 3,
            "NumHBD": 0,
            "NumHBA": 0,
            "NumAmideBonds": 0,
            "NumHeteroAtoms": 0,
            "NumHeavyAtoms": 14,
            "NumAtoms": 28,
            "NumRings": 2,
            "NumAromaticRings": 2,
            "NumSaturatedRings": 0,
            "NumAliphaticRings": 0,
            "NumAromaticHeterocycles": 0,
            "NumSaturatedHeterocycles": 0,
            "NumAliphaticHeterocycles": 0,
            "NumAromaticCarbocycles": 2,
            "NumSaturatedCarbocycles": 0,
            "NumAliphaticCarbocycles": 0,
            "FractionCSP3": 0.14285714285714285,
            "Chi0v": 8.187716254269354,
            "Chi1v": 5.028473986232466,
            "Chi2v": 3.471197119306979,
            "Chi3v": 2.387999593344604,
            "Chi4v": 1.578029610279528,
            "Chi1n": 5.028473986232466,
            "Chi2n": 3.471197119306979,
            "Chi3n": 2.387999593344604,
            "Chi4n": 1.578029610279528,
            "HallKierAlpha": -1.5599999999999996,
            "kappa1": 9.01309382086168,
            "kappa2": 4.6134242634130755,
            "kappa3": 2.4617954580094508,
            "slogp_VSA1": 0.0,
            "slogp_VSA2": 0.0,
            "slogp_VSA3": 12.841643245852019,
            "slogp_VSA4": 0.0,
            "slogp_VSA5": 11.126902983393991,
            "slogp_VSA6": 60.6636706846161,
            "slogp_VSA7": 0.0,
            "slogp_VSA8": 0.0,
            "slogp_VSA9": 0.0,
            "slogp_VSA10": 0.0,
            "slogp_VSA11": 0.0,
            "slogp_VSA12": 0.0,
            "smr_VSA1": 0.0,
            "smr_VSA2": 0.0,
            "smr_VSA3": 0.0,
            "smr_VSA4": 0.0,
            "smr_VSA5": 12.841643245852019,
            "smr_VSA6": 0.0,
            "smr_VSA7": 71.7905736680101,
            "smr_VSA8": 0.0,
            "smr_VSA9": 0.0,
            "smr_VSA10": 0.0,
            "peoe_VSA1": 0.0,
            "peoe_VSA2": 0.0,
            "peoe_VSA3": 0.0,
            "peoe_VSA4": 0.0,
            "peoe_VSA5": 0.0,
            "peoe_VSA6": 60.6636706846161,
            "peoe_VSA7": 23.96854622924601,
            "peoe_VSA8": 0.0,
            "peoe_VSA9": 0.0,
            "peoe_VSA10": 0.0,
            "peoe_VSA11": 0.0,
            "peoe_VSA12": 0.0,
            "peoe_VSA13": 0.0,
            "peoe_VSA14": 0.0,
            "MQN1": 14,
            "MQN2": 0,
            "MQN3": 0,
            "MQN4": 0,
            "MQN5": 0,
            "MQN6": 0,
            "MQN7": 0,
            "MQN8": 0,
            "MQN9": 0,
            "MQN10": 0,
            "MQN11": 0,
            "MQN12": 14,
            "MQN13": 3,
            "MQN14": 0,
            "MQN15": 0,
            "MQN16": 6,
            "MQN17": 6,
            "MQN18": 0,
            "MQN19": 3,
            "MQN20": 0,
            "MQN21": 0,
            "MQN22": 0,
            "MQN23": 0,
            "MQN24": 0,
            "MQN25": 0,
            "MQN26": 0,
            "MQN27": 2,
            "MQN28": 0,
            "MQN29": 0,
            "MQN30": 10,
            "MQN31": 2,
            "MQN32": 0,
            "MQN33": 0,
            "MQN34": 0,
            "MQN35": 0,
            "MQN36": 2,
            "MQN37": 0,
            "MQN38": 0,
            "MQN39": 0,
            "MQN40": 0,
            "MQN41": 0,
            "MQN42": 0,
            "selected smiles (#1)": "C(Cc1ccccc1)c1ccccc1",
            "ALogP - Ghose-Crippen LogKow": 2.5404000000000004,
            "ALogP2": 6.453632160000002,
            "AMR - molar refractivity": 69.2022,
            "Mannhold LogP": 3.0,
            "Atomic Polarizabilities": 33.975101999999985,
            "Aromatic Atoms Count": 12,
            "Aromatic Bonds Count": 12,
            "Element Count": 28,
            "Bond Polarizabilities": 15.304897999999996,
            "Bond Count": 15,
            "Eccentric Connectivity Index": 212,
            "Fragment Complexity": 659.0,
            "VABC Volume Descriptor": 188.36857385653363,
            "Hydrogen Bond Acceptors": 0,
            "Hydrogen Bond Donors": 0,
            "Largest Chain": 2,
            "Largest Pi Chain": 6,
            "Petitjean Number": 0.4444444444444444,
            "Rotatable Bonds Count": 3,
            "Lipinski's Rule of Five": 0,
            "Topological Polar Surface Area": 0.0,
            "Vertex adjacency information magnitude": 4.906890595608519,
            "Molecular Weight": 182.109550448,
            "XLogP": 4.368,
            "Zagreb Index": 66.0,
            "Molecular Formula": "C14H14",
            "Formal Charge": 0,
            "Formal Charge (pos)": 0,
            "Formal Charge (neg)": 0,
            "Heavy Atoms Count": 14,
            "Molar Mass": 182.26147310859307,
            "SP3 Character": 0.07142857142857142,
            "Rotatable Bonds Count (non terminal)": 3
        }
    }   
    
    ]


# print including time
def printt(*arg):
    time_stamp = time.strftime('%X')
    print(time_stamp,*arg)

def setHash(the_hash,the_key,the_value):
    the_hash[the_key] = the_value

def save_compound(compound_hash,exclude=['thread']):
    new_hash = {}
    if compound_hash['thread']:
        running_time   = compound_hash['thread'].current_running_time
        running_status = compound_hash['thread'].status_string
        if not compound_hash['thread'].finished():
            new_hash['thread'] = {"status":"{}".format(running_status),"running_time":"{:.2f}".format(running_time)}
        else:
            # job should be finished, now get the result
            new_hash['thread'] = {"status":"{}".format(running_status),"running_time":"{:.2f}".format(running_time)}
            compound_hash["status"] = STATUS.COLLECTING_JOB
            results_collected = _collectJob(compound_hash["job_id"],compound_hash["compound_id"],compound_hash["compound_structure_smiles"])
            if results_collected and results_collected['value']:
                # assuming one single compound prediction
                results = results_collected['value'][0]
                # secondary check:                
                # put some fall back in - HACK!
                resp_irritation = -1
                compound_hash["Prediction (endpoint)"] = -1
                compound_hash["calculated_data"] = {}
                compound_hash["status"] = STATUS.COLLECTING_JOB_ERROR
                try:
                    resp_irritation = results["Prediction (endpoint)"]
                    keys = list(results.keys())
                    keys.remove("Prediction (endpoint)")
                    compound_hash["Prediction (endpoint)"] = resp_irritation
                    compound_hash["calculated_data"] = {k: results[k] for k in keys}
                    compound_hash["status"] = STATUS.RUN_JOB_END
                except:
                    print('DEBUG: No "Prediction (endpoint)" in results!')
                    pass
            else:
                compound_hash["calculated_data"] = {}
                compound_hash["Prediction (endpoint)"] = -1
                compound_hash["status"] = STATUS.COLLECTING_JOB_ERROR
            try:
                compound_hash["workflow_rt_err"] = results["RT_ERR"]
                compound_hash["workflow_rt_err_string"] = knime_workflow_error_codes[results["RT_ERR"]]
            except:
                pass
            new_hash["calculated_data"] = compound_hash["calculated_data"]
            new_hash["Prediction (endpoint)"] = compound_hash["Prediction (endpoint)"]
    [setHash(new_hash,compound_key,compound_hash[compound_key]) for compound_key in compound_hash.keys() if compound_key not in exclude]
    return new_hash


# my own Job queue
class JobQueue:
    def __init__(self):
        self.items = []

    def empty(self):
        return self.items == []

    def put(self, item):
        self.items.insert(0,item)

    def get(self):
        return self.items.pop()

    def size(self):
        return len(self.items)

    def __str__(self):
        return 'JobQueue: {}'.format(['Job:{}'.format(x.__str__()) for x in self.items])


# class for containing JobObjects

class Jobs:
    
    def __init__(self):
        self.current_job = None
        self.job_queue   = JobQueue()

    def addJob(self,job):
        job_to_queue = job
        if type(job) == type([]):
            job_to_queue = Job(cmds)
        self.job_queue.put(job_to_queue)

    # job finshed detected from outside
    def currentJobFinishedSignal(self):
        self.current_job = None
        
    def processQueue(self):
        # trace
        print()
        printt('*'*80)
        job_running = False
        debug_status_information = 'None'
        # check if we currently have a job running
        if self.current_job:
            job_status_own = self.current_job.finished()
            # printt('processQueue05a',job_status_own)
            # printt('processQueue05b',self.current_job)
            # the last job finished
            job_running = not job_status_own # if finished we would get a True
            debug_status_information = 'job finished, setting removing current job'
            if job_status_own:
                # printt('processQueue05c')
                self.current_job = None
        # check if the job queue is still full - in case of no current job, start a new one from queue
        if not job_running and not self.job_queue.empty():
            # printt('processQueue10a:new job start')
            self.current_job = self.job_queue.get()
            self.current_job.start()
            job_running = True
            debug_status_information = 'new job started'
        if not job_running and self.job_queue.empty():
            printt('No job running and none in queue')
            debug_status_information = 'No job running and none in queue'

        global recursionCount
        printt('Job Queue Status: {}'.format(debug_status_information))
        recursionCount += 1
        printt('Number called:    {}'.format(recursionCount))
        printt('Current Job:      {}'.format('{}'.format(self.current_job))[:40])
        printt('Length Queue:     {}'.format(self.job_queue.size()))
        printt('*'*80)
        # print( threading.enumerate() )
        print()
        # global global_job_process_thread
        # global_job_process_thread.run()

    def __str__(self):
        return '{}\t{}'.format(self.current_job,self.job_queue)
    

# new Job class to work with Jobs objects
# Job need to be created (initialized)
# start Job now separetely

class Job:
    global settings

    # not sure why this is not working right now
    timeout = 600
    try:
        timeout = settings['job_timeout']
    except:
        pass
    
    def __init__(self,cmds):
        self.cmds                 = cmds
        self.starttime            = None
        self.current_running_time = -1
        self.lastcheck            = None
        self.status               = None
        self.status_string        = "initialised"
        printt('Job(cmds)',self.cmds)

        
    def start(self):
        self.starttime            = time.time()
        self.lastcheck            = self.starttime
        self.current_running_time = self.lastcheck-self.starttime
        self.process              = subprocess.Popen(self.cmds, shell=False)
        self.status               = self.process.poll()
        self.status_string        = "running"
        
    def finished(self):
        # check if terminated:
        if self.status_string != 'initialised':
            self.lastcheck = time.time()
            self.status    = self.process.poll() 

            #printt('self.status',self.status)
            if self.status != None:
                #printt('Process finished')
                self.status_string = "finished"
                return True
            # else:
                #printt('Process running')

            self.current_running_time = self.lastcheck-self.starttime

            if self.current_running_time > self.timeout:
                printt('Process should be killed')
                self.status_string = "timeout"
        return False

    def __str__(self):
        return_val =  {
            'starttime':self.starttime,
            'current_running_time':self.current_running_time,
            'lastcheck':self.lastcheck,
            'status':self.status,
            'status':self.cmds
            }

        return '{}'.format(return_val)



    
# class Job:
#     global settings
#     timeout = settings['job_timeout']
    
#     def __init__(self,cmds):
#         self.starttime = time.time()
#         self.lastcheck = self.starttime
#         self.current_running_time = self.lastcheck-self.starttime
#         print('Job(cmds)',cmds)
#         self.process   = subprocess.Popen(cmds, shell=False)
#         self.status    = self.process.poll()
#         self.status_string = "running"

#     def finished(self):
#         # check if terminated:
#         self.lastcheck = time.time()
#         self.status    = self.process.poll() 

#         #print('self.status',self.status)
#         if self.status != None:
#             #print('Process finished')
#             self.status_string = "finished"
#             return True
#         # else:
#             #print('Process running')

#         self.current_running_time = self.lastcheck-self.starttime

#         if self.current_running_time > self.timeout:
#             print('Process should be killed')
#             self.status_string = "timeout"
#         return False
    
#     def __str__(self,o):
#         return_val =  {
#             'starttime':self.starttime,
#             'current_running_time':self.current_running_time,
#             'lastcheck':self.lastcheck,
#             'status':self.status
#             }

#         return return_val


class respiraToxSettings:

    def __init__(self,settings_filename='respiraTox_settings.json'):

        settings_read = None
        
        if os.path.exists(settings_filename):
            try:
                self.settings = json.load(open(settings_filename))
                settings_read = True
            except Exception as e:
                print('An exception occurred: <<{}>>'.format(e))
                pass
        # if settings could not be read
        if not settings_read:
            print('Could not read settings file <<{}>>'.format(settings_filename))
            print('Setting to hardcoded defaults')

            self.settings = self._default()

    def getSettings(self):
        return self.settings
            
    def _default(self):


        return {
            'port':5555,
            'IP':'127.0.0.1',
            "job_timeout":120,
            'knime':{
                'application':'/Applications/KNIME 3.5.2.app/Contents/MacOS/Knime',
                'default_parameters':['-reset', '-nosplash', '--launcher.suppressErrors', '-application', 'org.knime.product.KNIME_BATCH_APPLICATION'],
                'workflow_name':'knime_respiraTox_predict_json',
                'model_name':'CURRENTLY-NOT-USED',
                'workflow_dir':'/Users/karwath/knime-workspace',
                'json_dir':'respiraTox_predict_json',
                'infile_name_stem':'Compound_{}_in.json',
                'outfile_name_stem':'Compound_{}_out.json'
            }
        }
    
        
class Converter(Resource):

    def _convert(self,smiles_string):
        conversion_error = True
        return_value = smiles_string
        if openbabel:
            try:
                mol_to_convert = pybel.readstring("smi",smiles_string)
                return_value = mol_to_convert.write('mol')
                conversion_error = False
            except Exception as e:
                print('smiles_string:{}'.format(smiles_string))
                print(e)
                pass

        return return_value
    
    # converts a SMILES string via openbabel using simple get
    def get(self,smiles_string):
        return self._convert(smiles_string)
            
    # converts a SMILES string via openbabel using simple get
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument("smiles_string")
        args = parser.parse_args()
        return self._convert(args['smiles_string'])

        
        return self._convert(smiles_string)
            
                
class Compounds(Resource):

    # returns the list of saved compounds
    def get(self):
        return_compounds = [save_compound(compound) for compound in compounds]
        return return_compounds, 200

    def post(self):
        # creates a new compound and prediction
        parser = reqparse.RequestParser()
        parser.add_argument("compound_structure_smiles")
        parser.add_argument("compound_id")
        parser.add_argument("compound_substructure_filter")
        parser.add_argument("compound_properties_anorganic")
        parser.add_argument("compound_properties_organic")
        parser.add_argument("compound_properties_acid")
        parser.add_argument("compound_properties_base")
        parser.add_argument("calculation_fingerprint_type")
        parser.add_argument("calculation_distance_method")
        parser.add_argument("calculation_model_id")
        parser.add_argument("calculation_prediction_endpoint")
        args = parser.parse_args()
        #print('\nDebug:\n\t{}\n\t{}\n'.format(args["compound_id"],args["compound_structure_smiles"]))
        job_id = len(compounds)+1
        
        compound = {
            "job_id":str(job_id),
            "compound_id":args["compound_id"],
            "compound_structure_smiles":args["compound_structure_smiles"],
            "compound_substructure_filter":saveGetDefault(args,"compound_substructure_filter",'*'),
		    "calculation_fingerprint_type":saveGetDefault(args,"calculation_fingerprint_type",'PubChem'),
		    "calculation_distance_method":saveGetDefault(args,"calculation_distance_method",'Tanimoto'), 
		    "calculation_model_id":saveGetDefault(args,"calculation_model_id",'default'), 
		    "calculation_prediction_endpoint":saveGetDefault(args,"calculation_prediction_endpoint",'sensory_irritation'),
            "Prediction (endpoint)":None,
            "status":None,
            "thread":None
            }

        compound_results = _runKnime(
            compound["job_id"],
            compound["compound_id"],
            compound["compound_structure_smiles"],
            compound["compound_substructure_filter"],
            compound["calculation_fingerprint_type"],
            compound["calculation_distance_method"],
            compound["calculation_model_id"],
            compound["calculation_prediction_endpoint"],
            )
        #pprint(compound_results)
        compound['status'] = compound_results["status"]
        compound['thread'] = compound_results["thread"]
        
        # # try:
        # # only assumes a single compound being run
        # compound_result = compound_results['data'][0]
        # compound["Prediction (endpoint)"] = compound_result["Prediction (endpoint)"]
        # keys = list(compound_result.keys())
        # keys.remove("Prediction (endpoint)")
        # compound["calculated_data"] = {k: compound_result[k] for k in keys}
        # # except:
        # #     compound["Prediction (endpoint)"] = compound_results["summary"]
        # #     pass

        compounds.append(compound)

        # update job queue
        global_job_queue.processQueue()

        return save_compound(compound,['thread']), 201

        

    
class Compound(Resource):


    def _getArgs(self):
        parser = reqparse.RequestParser()
        parser.add_argument("compound_structure_smiles")
        parser.add_argument("compound_id")
        args = parser.parse_args()
        return args
    
    # get existing compound
    def get(self, job_id):

        # update job queue
        global_job_queue.processQueue()
        
        global compounds
        for compound in compounds:
            if job_id == compound["job_id"]:
                return_compound = save_compound(compound)
                return_code = 202
                if return_compound["status"] == STATUS.RUN_JOB_END:
                    return_code = 200

                return return_compound, return_code
        return "Compound not found", 404

    # create new compound
    def post(self, job_id):
        global compounds
        parser = reqparse.RequestParser()
        parser.add_argument("compound_structure_smiles")
        parser.add_argument("compound_id")
        parser.add_argument("compound_substructure_filter")
        parser.add_argument("compound_properties_anorganic")
        parser.add_argument("compound_properties_organic")
        parser.add_argument("compound_properties_acid")
        parser.add_argument("compound_properties_base")
        parser.add_argument("calculation_fingerprint_type")
        parser.add_argument("calculation_distance_method")
        parser.add_argument("calculation_model_id")
        parser.add_argument("calculation_prediction_endpoint")
        args = parser.parse_args()
        #print('\nDebug:\n\t{}\n\t{}\n'.format(args["compound_id"],args["compound_structure_smiles"]))
        job_id = len(compounds)+1
        

        for compound in compounds:
            if job_id == compound["job_id"]:
                return "Compound with job_id <<{}>> already exists".format(job_id), 400
        
        compound = {
            "job_id":str(job_id),
            "compound_id":args["compound_id"],
            "compound_structure_smiles":args["compound_structure_smiles"],
            "compound_substructure_filter":args["compound_substructure_filter"],
		    "calculation_fingerprint_type":args["calculation_fingerprint_type"],
		    "calculation_distance_method":args["calculation_distance_method"], 
		    "calculation_model_id":args["calculation_model_id"], 
		    "calculation_prediction_endpoint":args["calculation_prediction_endpoint"],
            "Prediction (endpoint)":None,
            "status":None,
            "thread":None
            }

        compound_result = _runKnime(
            compound["job_id"],
            compound["compound_id"],
            compound["compound_structure_smiles"],
            compound["compound_substructure_filter"],
            compound["calculation_fingerprint_type"],
            compound["calculation_distance_method"],
            compound["calculation_model_id"],
            compound["calculation_prediction_endpoint"],
            )
        
        compounds.append(compound)

        # update job queue
        global_job_queue.processQueue()

        return save_compound(compound),202

    # update existing compound if exsists or create new one otherwise
    
    def put(self, job_id):
        global compounds
        parser = reqparse.ResquestParser()
        parser.add_argument("compound_id")
        parser.add_argument("compound_structure_smiles")
        args = parser.parse_args()

        for compound in compounds:
            if job_id == compound["job_id"]:
                compound["compound_structure_smiles"] =args["compound_structure_smiles"],
                compound["compound_id"] =args["compound_id"],
                return save_compound(compound), 200

        # create new compound, as previous job_id was not found
        compound = {
            "job_id":str(job_id),
            "compound_id":args["compound_id"],
            "compound_structure_smiles":args["compound_structure_smiles"],
            "Prediction (endpoint)":None
            }
        
        compounds.append(compound)

        # update job queue
        global_job_queue.processQueue()
        
        return save_compound(compound),201

    
    def delete(self, job_id):
        global compounds
        compounds = [compound for compound in compounds if compound["job_id"] != job_id]
        return "Deleted compound with job_id=<<{}>>".format(job_id), 200

def _setupJob(job_id,compound_id,compound_structure_smiles,results=None,
                  compound_substructure_filter='*',
                  calculation_fingerprint_type='PubChem',
                  calculation_distance_method='Tanimoto',
                  calculation_model_id='default',
                  calculation_prediction_endpoint='sensory_irritation'):
    if not results:
        results = {
            'status':STATUS.JOBFILE_CREATION,
            'value':None,
            'thread':None}
    
    
    # ugly, ugly, ugly
    global settings
    knime_json_dir     = '{}{}{}'.format(settings['knime']['workflow_dir'],os.path.sep,settings['knime']['json_dir'])
    knime_workflow_dir = '{}{}{}'.format(settings['knime']['workflow_dir'],os.path.sep,settings['knime']['workflow_name'])

    # inputJSON = '{{"entries":[{{"compound_id":"{}","compound_structure_smiles":"{}"}}]}}'.format(compound_id,compound_structure_smiles)
    inputJSON = '{{"entries":[{{"compound_id":"{}","compound_structure_smiles":"{}","compound_substructure_filter":"{}","compound_properties":{},"calculation_fingerprint_type":"{}","calculation_distance_method":"{}","calculation_model_id":"{}","calculation_prediction_endpoint":"{}"}}]}}'.format(compound_id,compound_structure_smiles,compound_substructure_filter,'{"anorganic":"1","organic":"0","acid":"0","base":"0"}',calculation_fingerprint_type,calculation_distance_method,calculation_model_id,calculation_prediction_endpoint)

    
    inputJSON_filename = '{}{}{}'.format(knime_json_dir,os.path.sep,settings['knime']['infile_name_stem'].format(job_id))

    try:
        with open(inputJSON_filename,'w') as fh:
            fh.writelines(['{}\n'.format(inputJSON)])
        results['status']    = STATUS.JOBFILE_CREATION_END
        results['value']     = inputJSON_filename
    except:
        results['status'] = STATUS.JOBFILE_CREATION_ERROR
        pass

    # try and create empty result file - check if possible
    outputJSON_filename = '{}{}{}'.format(knime_json_dir,os.path.sep,settings['knime']['outfile_name_stem'].format(job_id))
    try:
        with open(outputJSON_filename,'w') as fh:
            fh.writelines(['',])
    except:
        results['status'] = STATUS.OUTFILE_CREATION_ERROR
        pass
    try:
        os.remove(outputJSON_filename)
    except:
        results['status'] = STATUS.OUTFILE_DELETION_ERROR
        pass
        
    return results
    
def _runJob(job_id,compound_id,compound_structure_smiles,results=None):
    if not results:
        results = {
            'status':STATUS.RUN_JOB,
            'value':None,
            'thread':None}
    else:
        results['status'] = STATUS.RUN_JOB
    
    
    # ugly, ugly, ugly
    global settings
    knime_json_dir     = '{}{}{}'.format(settings['knime']['workflow_dir'],os.path.sep,settings['knime']['json_dir'])
    knime_workflow_dir = '{}{}{}'.format(settings['knime']['workflow_dir'],os.path.sep,settings['knime']['workflow_name'])

    inputJSON_filename = '{}{}{}'.format(knime_json_dir,os.path.sep,settings['knime']['infile_name_stem'].format(job_id))
    outputJSON_filename = '{}{}{}'.format(knime_json_dir,os.path.sep,settings['knime']['outfile_name_stem'].format(job_id))
    outputJSON = None
   
    cmds = [
        settings['knime']['application'],]+settings['knime']['default_parameters']+[
        "-workflow.variable=inputJSON,{},String".format(inputJSON_filename),
        "-workflow.variable=outputJSON,{},String".format(outputJSON_filename),
        "-workflowDir={}".format(knime_workflow_dir)
        ]

    # cmds = [
    #     'date; ls -l; sleep 15; date; echo',
    #     # 'date; sleep 5; date',
    #     # 'date; df -h; sleep 3; date',
    #     # 'date; hostname; sleep 2; date',
    #     # 'date; uname -a; date',
    # ]        
    results['value'] = cmds

    
    try:
        # create job
        job_thread = Job(cmds)
        # put into queue
        global_job_queue.addJob(job_thread)
        
        results['status'] = STATUS.RUN_JOB_PROCESSING
        results['thread'] = job_thread
    except Exception as e:
        results['status'] = STATUS.RUN_JOB_ERROR
        print(e)
        pass

    return results


def _collectJob(job_id,compound_id,compound_structure_smiles,results=None):
    if not results:
        results = {
            'status':STATUS.COLLECTING_JOB,
            'value':None,
            'thread':None}
    else:
        results['status'] = STATUS.COLLECTING_JOB
    
    
    # ugly, ugly, ugly
    global settings
    knime_json_dir     = '{}{}{}'.format(settings['knime']['workflow_dir'],os.path.sep,settings['knime']['json_dir'])
    outputJSON_filename = '{}{}{}'.format(knime_json_dir,os.path.sep,settings['knime']['outfile_name_stem'].format(job_id))
    outputJSON = None

    result_data = None
    if os.path.exists(outputJSON_filename):
        data = None
        with open(outputJSON_filename) as fh:
            data = json.load(fh)
            results['status'] = STATUS.COLLECTING_JOB
        try:
            result_data = data[0]
            results['status'] = STATUS.COLLECTING_JOB_DATA
            results['value']  = result_data
        except:
            results['status'] = STATUS.COLLECTING_JOB_ERROR
            pass
    else:
        results['status'] = STATUS.COLLECTING_JOB_ERROR_FNF
            
    return results
    
    
def _runKnime(job_id,
                  compound_id,
                  compound_structure_smiles,
                  compound_substructure_filter='*',
                  calculation_fingerprint_type='PubChem',
                  calculation_distance_method='Tanimoto',
                  calculation_model_id='default',
                  calculation_prediction_endpoint='sensory_irritation'
                  ):
    # only works for a single compound - currently

    results = {
        'status': None,
        'value':None,
        'thread':None
        }
    results = _setupJob(job_id,compound_id,compound_structure_smiles,results=results,
                            compound_substructure_filter=compound_substructure_filter,
                            calculation_fingerprint_type=calculation_fingerprint_type,
                            calculation_distance_method=calculation_distance_method,
                            calculation_model_id=calculation_model_id,
                            calculation_prediction_endpoint=calculation_prediction_endpoint)
    
    if results['status'] == STATUS.JOBFILE_CREATION_END:
        results = _runJob(job_id,compound_id,compound_structure_smiles,results=results)
        # if results['status'] == STATUS.RUN_JOB_PROCESSING:
        #     results = _collectJob(job_id,compound_id,compound_structure_smiles,results=results)

    # if results['status'] not in STATUS_ERRORS:
    #     results['summary'] = 'success'
    # else:
    #     results['summary'] = 'success'
    #     results['data']    = result_data
    
    return results



def setup(settings):
    # check whether or not directories can be created
    #print(settings['knime'])
    # print(settings['knime']['workflow_dir'])
    # print(settings['knime']['workflow_name'])
    knime_workflow_dir = '{}{}{}'.format(settings['knime']['workflow_dir'],os.path.sep,settings['knime']['workflow_name'])
    # print(knime_workflow_dir)
    knime_json_dir     = '{}{}{}'.format(settings['knime']['workflow_dir'],os.path.sep,settings['knime']['json_dir'])
    if not os.path.exists(knime_workflow_dir):
        print('Workspace directory does not exist: <<{}>>'.format(knime_workflow_dir))
        sys.exit(4)
    if not os.path.exists(knime_json_dir):
        try:
            os.makedirs(knime_json_dir)
        except:
            print('Could not create JSON directory: <<{}>>'.format(knime_json_dir))
            sys.exit(6)
        print('Created JSON directory: <<{}>>'.format(knime_json_dir))
        
    else:
        # print('Using the following JSON directory: <<{}>>'.format(knime_json_dir))
        # should check whether this is a directory and whether it is writable
        None


    
    app = Flask(__name__)
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
        return response


    api = Api(app)

    api.add_resource(Compound,"/compound/<string:job_id>")
    api.add_resource(Compounds,"/compound/")
    # api.add_resource(Converter,"/converter/<string:smiles_string>")
    api.add_resource(Converter,"/smiles/")
    
    app.run(
        host=settings['IP'],
        port=settings['port'],
        # debug=eval(settings['debug'])
        debug=False
        )

    # print( threading.enumerate() )
    

rest_app = None
    
if __name__ == '__main__':

    #settings_filename = None
    
    parser = OptionParser()
    parser.add_option("-s", "--settings", default='respiraTox_settings.json', dest="settings_filename", help="the settings filename. Content should be in JSON format (default = respiraTox_settings.json)", metavar="FILE")

    # handle settings
    (options, args) = parser.parse_args()
    settings = None
    settingsInstance = respiraToxSettings(options.settings_filename)
    settings = settingsInstance.getSettings()

    # set up job queue
    # global global_job_queue
    global_job_queue = Jobs()
    # setting up job check thread
    # global global_job_queue_intervall
    # global global_job_process_thread
    # global_job_process_thread = threading.Timer(global_job_queue_intervall, global_job_queue.processQueue)  # timer is set to global_job_queue_intervall seconds
    # global_job_process_thread.start()

    rest_app  = setup(settings)

    # clean up thread 
    # if global_job_process_thread.is_alive():
    #     global_job_process_thread.cancel()

    print('REST SETUP FINISHED')
## curl test commands:

# GET
# curl "http://127.0.0.1:5000/compound/1"


# POST
# curl --data "compound_id=J21&compound_structure_smiles=c1ccccccc1CCCc2cccccc2"  "http://127.0.0.1:5000/compound/3"
