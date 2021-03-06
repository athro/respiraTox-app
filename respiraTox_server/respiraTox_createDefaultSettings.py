import json

settings = {
            'port':5555,
            'IP':'127.0.0.1',
            'knime':{
                'application':'/Applications/KNIME 3.5.2.app/Contents/MacOS/Knime',
                'default_parameters':['-reset', '-nosplash', '-application', '-consoleLog', 'org.knime.product.KNIME_BATCH_APPLICATION'],
                'workflow_name':'knime_respiraTox_predict_json',
                'model_name':'CURRENTLY-NOT-USED',
                'workflow_dir':'/Users/karwath/knime-workspace',
                'json_dir':'respiraTox_predict_json',
                'infile_name_stem':'Compound_{}_in.json',
                'outfile_name_stem':'Compound_{}_out.json'
            }
        }


json.dump(settings, open('respiraTox_defaultSettings.json', 'w'))
json.load(open('respiraTox_defaultSettings.json'))   
