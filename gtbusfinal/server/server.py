
# python3 server.py
# http://127.0.0.1:5000/travel

from flask import Flask, Response, json, request
import pandas as pd
from aux import *
from flask_cors import CORS
import csv
import sys

#pip3 install flask_cors
from flask_cors import CORS, cross_origin


app = Flask(__name__)
CORS(app)

# All the files are open and returned as JSON
@app.route("/crowd", methods=['GET', 'POST'])
def crowd():
    data = request.get_json()
    df = pd.read_csv('./riders.csv')
    df = df.drop('Norm_count', axis=1)
    tr = df.loc[df['Route'] == data['route']]
    tr = tr.groupby(['Time']).mean()
    return tr.to_json()

@app.route("/travel", methods=['GET', 'POST'])
def travel():

    INFINITY = 99999999999999999

    stops = init_stops()
    add_next_buses_time(stops)

    data_dict = {}

    data = request.get_json()
    origin = [data['lngA'], data['latA']]
    destination = [data['lngB'], data['latB']]
    # except:
    #     resp = Response(json.dumps(data_dict))
    #     resp.headers['Access-Control-Allow-Origin'] = '*' #CORS
    #     return resp
        


    info = {}
    #routes = ['red', 'green', 'blue', 'trolley', 'night', 'tech']
    for route in ['red', 'green', 'blue', 'trolley', 'night', 'tech']:
        # origin = [-84.404, 33.778]
        # destination = [-84.389, 33.776]
        startr, endr, start_stops, end_stops = get_time_matrix(origin, destination, route, stops)
        nodes = init_nodes(start_stops, end_stops)
        arcs = init_arcs(start_stops, end_stops, startr, endr)
        compute_dijktra(nodes, arcs)
        #print_results_from_nodes(nodes, start_stops, end_stops)
        #data_dict['walking_time'] = nodes[0][0]
        info[route] = states_list(nodes, start_stops, end_stops)

    best = min(info.keys(), key = lambda x: info[x][-1]['atime'])
    for k in range(1,5):
        timeA = info[best][k-1]['atime']
        timeB = info[best][k]['atime']
        duration = timeB - timeA
        stopA = info[best][k-1]['stop']

        if stopA is None:
            positionA = {
                                'lng': origin[0],
                                'lat': origin[1]
                            }
            nameA = 'origin'
        else:
            positionA = stopA.lonlat
            nameA = stopA.name
        stopb = info[best][k]['stop']
        if stopb is None:
            positionB = {
                                'lng': destination[0],
                                'lat': destination[1]
                            }
            nameB = 'Destination'
        else:
            positionB = stopb.lonlat
            nameB = stopb.name

        if info[best][k-1]['node'] == (0, 0):
            action = "walk"
            text = "Walk to <b>{}</b> and wait for the <b>{}</b> bus".format(nameB, best)
        elif info[best][k-1]['node'][0] == 1:
            action = "wait"
            text = "Wait for <b>{} minutes</b> ".format(round(duration/60.0, 2))
        elif info[best][k-1]['node'][0] == 2:
            action = "ride"
            text = "Ride the bus to <b>{}</b>".format(nameB)
        else:
            action = "walk"
            text = "Walk to your destination"
        
        data_dict[str(k-1)] = {
            'duration': duration,
            'timeA': timeA,
            'timeB': timeB,
            'positionA': positionA,
            'positionB': positionB,
            'nameA': nameA,
            'nameB': nameB,
            'action': action,
            'text': text
        }
        

    #data_dict[route] = nodes[(0, 1)][0] if nodes[(0, 1)][0] < 10*60*60 else -1
    data_dict['walking_time'] = startr[0][0]
    data_dict['walking_url'] = walking_url(origin, destination)
    data_dict['route'] = best
    data_dict['bus_time'] = info[best][-1]['atime']
    resp = Response(json.dumps(data_dict))
    resp.headers.add('Access-Control-Allow-Origin', '*')# = '*' #CORS
    return resp


@app.route("/stop", methods=['GET', 'POST'])
def stop_stat():
    #try:
    data = request.get_json()
    route = data['route']
    stop = data['stop']
    print(route, stop)
    data_dict = stop_stats(route, stop)
    #except:
    #print("error")
    #data_dict = {}

    resp = Response(json.dumps(data_dict))
    resp.headers.add('Access-Control-Allow-Origin', '*')# = '*' #CORS
    return resp

if __name__ == "__main__":
    app.run(port=5000)