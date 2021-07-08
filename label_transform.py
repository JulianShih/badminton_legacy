import csv
import os
# import tkinter as tk
import cv2
import math
import numpy as np

width, height = 305, 670

hit_area_heatmap_info = []

def get_xy(x, y, matrix):
    if x == '' or y == '':
        return ['', '']
    x = int(float(x))
    y = int(float(y))
    point = np.float32([[x, y]]).reshape(-1, 1, 2)
    homomatrix = np.matrix(matrix).reshape(3, 3)
    xy = cv2.perspectiveTransform(point, homomatrix)
    return [int(xy[0][0][0] - 22), int(xy[0][0][1] - 145)]


def get_last_3_balls_xy(hitpoint, last_2_hitpoint, last_3_hitpoint, last_4_hitpoint):
    # print(hitpoint)
    # print(last_2_hitpoint)  # timing 3
    # print(last_3_hitpoint)  # timing 2
    # print(last_4_hitpoint)  # timing 1
    last_3_balls = []
    # 是否同一分
    if last_4_hitpoint[0] != hitpoint[0] or last_4_hitpoint[no_hit_x] == '':
        last_3_balls.append([])
    else:
        last_3_balls.append([last_4_hitpoint[no_hit_x], last_4_hitpoint[no_hit_y]])

    if last_3_hitpoint[0] != hitpoint[0] or last_3_hitpoint[no_hit_x] == '':
        last_3_balls.append([])
    else:
        last_3_balls.append([last_3_hitpoint[no_hit_x], last_3_hitpoint[no_hit_y]])

    if last_2_hitpoint[0] != hitpoint[0] or last_2_hitpoint[no_hit_x] == '':
        last_3_balls.append([])
    else:
        last_3_balls.append([last_2_hitpoint[no_hit_x], last_2_hitpoint[no_hit_y]])

    return last_3_balls


# hit_point, hit_point_opponent, hit_point_ball, last_3_balls, set_i, pair_name, match_name
# hit_point, hit_point_opponent, hit_point_ball, last_3_balls, set_i, pair_name, match_name
def add_heatmap_1(heatmap, hit_point, hit_point_opponent, hit_point_ball, last_3_balls,
    set_i, pair_name, match_name):
    def add_1(heatmap, value, last_3_balls,
              hit_point, hit_point_opponent, hit_point_ball, set_i):
        global hit_area_heatmap, loss_heatmap
        # if grid_x < 0 or grid_x >= len(hit_area_heatmap) or grid_y < 0 or grid_y >= len(
        #         hit_area_heatmap[0]) or grid_x_opponent < 0 or grid_x_opponent >= len(
        #     hit_area_heatmap) or grid_y_opponent < 0 or grid_y_opponent >= len(
        #     hit_area_heatmap[0]):
        #     return

        if heatmap == 'hit_area':
            # hit_area_heatmap[grid_x][grid_y][grid_x_opponent][grid_y_opponent][ball_x][ball_y] += 1
            hit_area_heatmap_info.append([
                last_3_balls,
                hit_point,
                hit_point_opponent,
                hit_point_ball,
                set_i
            ])
        # elif heatmap == 'loss':
        #     loss_heatmap[grid_x][grid_y][grid_x_opponent][grid_y_opponent][ball_x][ball_y] += 1
        #     loss_heatmap_info[grid_x][grid_y][grid_x_opponent][grid_y_opponent][ball_x][ball_y].append(
        #         [last_3_balls, hit_point, hit_point_opponent, hit_point_ball, set_i])

    # hit_point = [video_name]
    # hit_point = hit_point
    # print(hit_point)
    # for p in hit_point:
    #     hit_point.append(p)
    hit_point.append(pair_name)
    hit_point.append(match_name)
   
    add_1(heatmap, 1.0, last_3_balls, hit_point, hit_point_opponent, hit_point_ball, set_i)


def cal_heatmap(display_player, pair_name, match_name):
    video_name = pair_name + '_' + match_name + '.mp4'
    global no_rally, no_frame, no_scoreA, no_scoreB, no_player, no_server, no_type, no_hit_x, no_hit_y, no_end
    no_rally = 0
    no_frame = 3
    no_scoreA = 4
    no_scoreB = 5
    no_player = 6
    no_server = 7
    no_type = 8
    no_hit_x = 13
    no_hit_y = 14
    no_end = 21

    if display_player == 'A':
        display_hit_player = 'A'
        display_end_player = 'B'
    elif display_player == 'B':
        display_hit_player = 'B'
        display_end_player = 'A'
    set_folder = './raw/' + video_name + '/label'
    set_num = len(os.listdir(set_folder))
    # print(set_num)
    # for set_i in range(set_num):
    for set_i in range(1, set_num + 1):
        # if i != 0:
        #     continue
        # set_i += 1
        print('set: ', set_i, video_name)
        # set_path = set_folder + '/set' + str(set_i + 1) + '.csv'
        set_path = set_folder + '/set' + str(set_i) + '.csv'
        label_transform_csv_file = open(set_path, 'r', newline='', encoding='utf-8')
        set_reader = csv.reader(label_transform_csv_file)
        headers = next(set_reader, None)
        print(headers)
        print(len(headers), headers[4])
        # if headers[4] != 'roundscore_A' and len(headers) == 31:
            # headers.pop(4)

        set_reader = list(set_reader)
        current_rally = ''
        current_playerA_side = ''

        homo_csv_file = open('./raw/homography_matrix.csv', 'r', newline='')
        homo_reader = csv.reader(homo_csv_file)
        for index, match in enumerate(homo_reader):
            if match[1] == pair_name + '_' + match_name:
                homography_matrix = match[2]  
                print(homography_matrix)
                # print(corners)
                break

        for index, hit_point in enumerate(set_reader):
            if headers[4] != 'roundscore_A' and len(headers) == 31:
                hit_point.pop(4)
            if hit_point[no_hit_x] == '0.0' or hit_point[no_hit_x] == '' or hit_point[no_hit_x] == '0':
                hit_point[no_hit_x] = ''
            if hit_point[no_hit_y] == '0.0' or hit_point[no_hit_y] == '' or hit_point[no_hit_y] == '0':
                hit_point[no_hit_y] = ''
            xy = get_xy(hit_point[no_hit_x], hit_point[no_hit_y], homography_matrix)
            hit_point[no_hit_x] = xy[0]
            hit_point[no_hit_y] = xy[1]

        for index, hit_point in enumerate(set_reader):
            print(hit_point)
            if index + 1 >= len(set_reader):
                continue

            rally = hit_point[no_rally]
            player = hit_point[no_player]  # player
            server = hit_point[no_server]  # server
            hit_x = hit_point[no_hit_x]  # hit_x
            hit_y = hit_point[no_hit_y]  # hit_y
            end = hit_point[no_end]  # end

            if current_rally != rally:  # new rally
                current_rally = rally
                next_hit = set_reader[index + 1]
                next_hit_player = next_hit[no_player]  # player
                next_hit_server = next_hit[no_server]  # server
                next_hit_y = next_hit[no_hit_y]
                if server == '1.0' or server == '1':
                    if next_hit_server == '1.0' or next_hit_server == '1': # server
                        continue
                if next_hit_y == '': # hit_y
                    continue
                # if next_hit_y < -1000: # hit_y
                #     if index + 2 >= len(set_reader):
                #         continue
                #     next_hit = set_reader[index + 2]
                if server == '1.0' or server == '1':
                    if next_hit_server == '1.0' or next_hit_server == '1': # server
                        continue
                if next_hit_player == '': # player
                    continue
                if next_hit_player == 'A' and next_hit_y < 67 * 5:
                    current_playerA_side = 'top'
                elif next_hit_player == 'A' and next_hit_y >= 67 * 5:
                    current_playerA_side = 'bot'
                elif next_hit_player == 'B' and next_hit_y < 67 * 5:
                    current_playerA_side = 'bot'
                elif next_hit_player == 'B' and next_hit_y >= 67 * 5:
                    current_playerA_side = 'top'
            if server == '1.0' or server == '1':
                continue
            # if end == display_end_player:  # player輸的球
            #     last_i = 1
            #     while True:
            #         hit_last_i = set_reader[index - last_i]  # 回擊者
            #         player_last_i = hit_last_i[7] # player
            #         if player_last_i == display_end_player:  # player的敵人(我方)
            #             hit_last_i_opponent = set_reader[index - last_i - 1]  # 前一球player位置
            #             hit_last_i_loss_ball = set_reader[index - last_i + 1]  # player的敵人打向何處而贏球
            #             hit_last_i_x = hit_last_i[14]
            #             hit_last_i_y = hit_last_i[15]
            #             hit_last_i_opponent_x = hit_last_i_opponent[14]
            #             hit_last_i_opponent_y = hit_last_i_opponent[15]
            #             hit_last_i_loss_ball_x = hit_last_i_loss_ball[14]
            #             hit_last_i_loss_ball_y = hit_last_i_loss_ball[15]
            #             hit_last_i_player = hit_last_i[7]
            #             if hit_last_i_x == '' or hit_last_i_y == '' or hit_last_i_opponent_x == '' or \
            #                             hit_last_i_opponent_y == '' or hit_last_i_loss_ball_x == '' or \
            #                             hit_last_i_loss_ball_y == '':
            #                 break
            #             # if hit_last_i_x < -30 or hit_last_i_y < -30 or \
            #             #         hit_last_i_opponent_x < -30 or hit_last_i_opponent_y < -30 or \
            #             #     hit_last_i_loss_ball_x < -30 or hit_last_i_loss_ball_y < -30:  # 沒有數據則略過
            #             #     break
            #             if hit_last_i_player == 'A' and current_playerA_side == 'top' and hit_last_i_y >= 67 * 5:
            #                 break
            #             if hit_last_i_player== 'A' and current_playerA_side == 'bot' and hit_last_i_y < 67 * 5:
            #                 break
            #             if hit_last_i_player == 'B' and current_playerA_side == 'top' and hit_last_i_y < 67 * 5:
            #                 break
            #             if hit_last_i_player == 'B' and current_playerA_side == 'bot' and hit_last_i_y >= 67 * 5:
            #                 break
            #             # last_i_grid_x, last_i_grid_y = get_grid_xy(hit_last_i_x, hit_last_i_y)
            #             # last_i_grid_x_opponent, last_i_grid_y_opponent = get_grid_xy(hit_last_i_opponent_x,
            #             #                                                              hit_last_i_opponent_y)
            #             # last_i_loss_ball_x, last_i_loss_ball_y = get_grid_xy(hit_last_i_loss_ball_x,
            #             #                                                      hit_last_i_loss_ball_y)
            #             last_3_balls = get_last_3_balls_xy(set_reader[index - last_i],
            #                                                set_reader[index - last_i - 2],
            #                                                set_reader[index - last_i - 3],
            #                                                set_reader[index - last_i - 4])
            #             loss_heatmap[last_i_grid_x][last_i_grid_y][last_i_grid_x_opponent][last_i_grid_y_opponent] += 1
            #             add_heatmap_1('loss', last_i_loss_ball_x, last_i_loss_ball_y, video_name,
            #                           last_3_balls, hit_last_i, hit_last_i_opponent, hit_last_i_loss_ball, match_name,
            #                           set_i, pair_name)
            #             total_loss_num += 1

            #             # if float(hit_last_i_opponent[9]) < 61 * 7:
            #             #     print('loss')
            #             #     heatmap = 'loss'
            #             #     print(hit_last_i_opponent[8], hit_last_i_opponent[9],
            #             #           61 - float(hit_last_i_opponent[8]) / 7, 67 - float(hit_last_i_opponent[9]) / 7)
            #             #     print('Grid : ', last_i_grid_x, last_i_grid_y)
            #             #     print(loss_heatmap)
            #             #     print(loss_heatmap[last_i_grid_x][last_i_grid_y])
            #             #     draw_grid_heatmap(heatmap, last_i_grid_x, last_i_grid_y)

            #             break
            #         last_i += 1
            # elif player == display_hit_player and (end == '' or end == 'nan'):  # player(敵方)擊球
            if player == display_hit_player and (end == '' or end == 'nan'):  # player(敵方)擊球
                # print(len(set_reader), index + 1)
                # print(set_reader[index])
                hit_point_opponent = set_reader[index - 1]  # player的敵人(我方)的位置
                hit_point_ball = set_reader[index + 1]  # player打向哪裡
                hit_point_opponent_end = hit_point_opponent[no_end]
                hit_point_opponent_x = hit_point_opponent[no_hit_x]
                hit_point_opponent_y = hit_point_opponent[no_hit_y]
                hit_point_ball_x = hit_point_ball[no_hit_x]
                hit_point_ball_y = hit_point_ball[no_hit_y]
                if hit_point_opponent_end == 'A' or hit_point_opponent_end == 'B':  # end
                    continue
                # if hit_point_opponent_x == 'nan' or hit_point_opponent_y == 'nan' or hit_point_ball_x == 'nan' or \
                #                 hit_point_ball_y == 'nan' or hit_x == 'nan' or hit_y == 'nan':
                #     continue
                if hit_point_opponent_x == '' or hit_point_opponent_y == '' or hit_point_ball_x == '' or \
                        hit_point_ball_y == '' or hit_x == '' or hit_y == '':
                    continue
                # if hit_point_opponent_x < -30 or hit_point_opponent_y < -30 or \
                #         hit_point_ball_x < -30 or hit_point_ball_y < -30 or hit_x < -30 or \
                #     hit_y < -30:
                #     continue
                if player == 'A' and current_playerA_side == 'top' and hit_y >= 67 * 5:
                    continue
                if player == 'A' and current_playerA_side == 'bot' and hit_y < 67 * 5:
                    continue
                if player == 'B' and current_playerA_side == 'top' and hit_y < 67 * 5:
                    continue
                if player == 'B' and current_playerA_side == 'bot' and hit_y >= 67 * 5:
                    continue
                # grid_x, grid_y = get_grid_xy(hit_x, hit_y)
                # grid_x_opponent, grid_y_opponent = get_grid_xy(hit_point_opponent[14], hit_point_opponent[15])
                # ball_x, ball_y = get_grid_xy(hit_point_ball[14], hit_point_ball[15])
                last_3_balls = get_last_3_balls_xy(set_reader[index], set_reader[index - 2], set_reader[index - 3],
                                                   set_reader[index - 4])
                # hit_area_heatmap[grid_x][grid_y][grid_x_opponent][grid_y_opponent] += 1
                add_heatmap_1('hit_area', hit_point, hit_point_opponent, hit_point_ball, last_3_balls, set_i, pair_name, match_name)
                # print(hit_area_heatmap_info)
                # total_hit_num += 1

                # if float(hit_point_opponent[9]) < 67 * 7:
                #     print('hit_area')
                #     heatmap = 'hit_area'
                #     grid_x, grid_y = get_grid_xy(hit_x, hit_y)
                #     print(hit_point_opponent[8], hit_point_opponent[9], (61 - float(hit_point_opponent[8]) / 7) / 5,
                #           (67 - float(hit_point_opponent[9]) / 7) / 5, 12 - (61 - float(hit_point_opponent[8]) / 7) / 5,
                #           14 - (67 - float(hit_point_opponent[9]) / 7) / 5, 12 - int((61 - float(hit_point_opponent[8]) / 7) / 5),
                #           14 - int((67 - float(hit_point_opponent[9]) / 7) / 5))
                #     print('Grid : ', grid_x, grid_y)
                #     draw_grid_heatmap(heatmap, grid_x, grid_y)

                # print(loss_heatmap)
                # print(hit_area_heatmap)
    # hit_area_heat_min = 0
    # for i in range(len(hit_area_heatmap)):
    #     for j in range(len(hit_area_heatmap[i])):
    #         for k in range(len(hit_area_heatmap[i][j])):
    #             for l in range(len(hit_area_heatmap[i][j][k])):
    #                 for m in range(len(hit_area_heatmap[i][j][k][l])):
    #                     for n in range(len(hit_area_heatmap[i][j][k][l][m])):
    #                         if hit_area_heatmap[i][j][k][l][m][n] > hit_area_heat_max:
    #                             hit_area_heat_max = hit_area_heatmap[i][j][k][l][m][n]
    # print('hit min max : ', hit_area_heat_min, hit_area_heat_max)
    # loss_heat_min = 0
    # for i in range(len(loss_heatmap)):
    #     for j in range(len(loss_heatmap[i])):
    #         for k in range(len(loss_heatmap[i][j])):
    #             for l in range(len(loss_heatmap[i][j][k])):
    #                 for m in range(len(loss_heatmap[i][j][k][l])):
    #                     for n in range(len(loss_heatmap[i][j][k][l][m])):
    #                         if loss_heatmap[i][j][k][l][m][n] > loss_heat_max:
    #                             loss_heat_max = loss_heatmap[i][j][k][l][m][n]
    # print('loss min max : ', loss_heat_min, loss_heat_max)


def write_heatmap_csv(playerA, playerB):
    def dis2(a, b):
        return math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]))
    # hit_area_heatmap_csv = open('hit_area_heatmap_' + player_name + '.csv', 'w', newline='')
    # hit_area_heatmap_csv_writer = csv.writer(hit_area_heatmap_csv)
    # loss_heatmap_csv = open('loss_heatmap_' + player_name + '.csv', 'w', newline='')
    # loss_heatmap_csv_writer = csv.writer(loss_heatmap_csv)
    # hit_area_heatmap_info_csv = open('hit_area_heatmap_info_' + player_name + '.csv', 'w', newline='')
    # hit_area_heatmap_info_csv_writer = csv.writer(hit_area_heatmap_info_csv)
    hit_area_heatmap_info_csv = open('./tables/' + playerA + '_' + playerB + '.csv', 'w', newline='')
    hit_area_heatmap_info_csv_writer = csv.writer(hit_area_heatmap_info_csv)
    # loss_heatmap_info_csv = open('loss_heatmap_info_' + player_name + '.csv', 'w', newline='')
    # loss_heatmap_info_csv_writer = csv.writer(loss_heatmap_info_csv)

    # hit_area_heatmap_csv_writer.writerow(
    #     ['my_x', 'my_y', 'opponent_x', 'opponent_y', 'value_00', 'value_01', 'value_02', 'value_10', 'value_11',
    #      'value_12', 'value_20', 'value_21', 'value_22'])
    # loss_heatmap_csv_writer.writerow(
    #     ['my_x', 'my_y', 'opponent_x', 'opponent_y', 'value_00', 'value_01', 'value_02', 'value_10', 'value_11',
    #      'value_12', 'value_20', 'value_21', 'value_22'])
    hit_area_heatmap_info_csv_writer.writerow([
        # 'match_name',
        #  'set', 'scoreA', 'scoreB', 'last4_x', 'last4_y', 'last3_x', 'last3_y', 'last2_x', 'last2_y', 'opponent_x',
        #  'opponent_y', 'my_x', 'my_y', 'ball_x', 'ball_y', 'velocity', 'type', 'video_name', 'ball_round'
        'set', 'scoreA', 'scoreB',
        'player_x', 'player_y',
        'opponent_x', 'opponent_y',
        'hit_x', 'hit_y',
        'last4_x', 'last4_y',
        'last3_x', 'last3_y',
        'last2_x', 'last2_y',
        'ball_round', 'velocity', 'type',
        'pair_name', 'match_name'
    ])
    # loss_heatmap_info_csv_writer.writerow(
    #     ['my_grid_x', 'my_grid_y', 'opponent_grid_x', 'opponent_grid_y', 'ball_grid_x', 'ball_grid_y', 'match_name',
    #      'set', 'scoreA', 'scoreB', 'last4_x', 'last4_y', 'last3_x', 'last3_y', 'last2_x', 'last2_y', 'opponent_x',
    #      'opponent_y', 'my_x', 'my_y', 'ball_x', 'ball_y', 'velocity', 'type', 'video_name', 'ball_round'])
    for i in range(len(hit_area_heatmap_info)):
        data = hit_area_heatmap_info[i]
        last_3_balls, hit_point, hit_point_opponent, hit_point_ball, set_index = data
        if last_3_balls[0] == []:
            last4_x, last4_y = 0, 0
        else:
            last4_x, last4_y = last_3_balls[0]
        if last_3_balls[1] == []:
            last3_x, last3_y = 0, 0
        else:
            last3_x, last3_y = last_3_balls[1]
        if last_3_balls[2] == []:
            last2_x, last2_y = 0, 0
        else:
            last2_x, last2_y = last_3_balls[2]
        ball_round = hit_point[1]  # 第幾球
        match_name = hit_point[-1]
        pair_name = hit_point[-2]
        # print(hit_point)
        scoreA = hit_point[no_scoreA]
        scoreB = hit_point[no_scoreB]
        # if shift_state == True:
        #     temp_next_score1 = str(set_index + 1) + '_' + str(int(scoreA) + 1).zfill(
        #         2) + '_' + str(int(scoreB)).zfill(2) + '.mp4'
        #     temp_next_score2 = str(set_index + 1) + '_' + str(int(scoreA)).zfill(
        #         2) + '_' + str(
        #         int(scoreB) + 1).zfill(2) + '.mp4'
        #     if temp_next_score1 in os.listdir('./data/' + video_name + '/rally_video/'):
        #         store_video_name = video_name + '/' + temp_next_score1
        #     elif temp_next_score2 in os.listdir('./data/' + video_name + '/rally_video/'):
        #         store_video_name = video_name + '/' + temp_next_score2
        #     else:
        #         store_video_name = video_name + '/' + str(set_index + 1) + '_' + str(
        #             scoreA).zfill(2) + '_' + str(scoreB).zfill(2) + '.mp4'
        oppo_x = hit_point_opponent[no_hit_x]
        oppo_y = hit_point_opponent[no_hit_y]
        my_x = hit_point[no_hit_x]
        my_y = hit_point[no_hit_y]
        ball_x = hit_point_ball[no_hit_x]
        ball_y = hit_point_ball[no_hit_y]
        type = hit_point[no_type]
        print([
            set_index, scoreA, scoreB,
            my_x, my_y,
            oppo_x, oppo_y,
            ball_x, ball_y,
            last4_x, last4_y,
            last3_x,last3_y,
            last2_x, last2_y,
            # ball_round, velocity, type,
            pair_name, match_name
        ])
        if ball_y < 67 * 5 and my_y < 67 * 5:
            continue
        if ball_y > 67 * 5 and my_y > 67 * 5:
            continue
        distance = int(float(hit_point_ball[no_frame])) - int(float(hit_point[no_frame]))
        # print(distance)
        if distance < 3: # frame
            continue
        velocity = dis2([ball_x / 5, ball_y / 5], [my_x / 5, my_y / 5]) / distance
        velocity = velocity * 30 / 10 * 3600 / 1000  # 公里 / 小時
        # print([match_name, set_index, scoreA, scoreB, last4_x,
        #      last4_y, last3_x, last3_y, last2_x, last2_y, oppo_x, oppo_y, my_x, my_y, ball_x,
        #      ball_y, velocity, type, store_video_name, ball_round])
        # print([
        #     set_index, scoreA, scoreB,
        #     my_x, my_y,
        #     oppo_x, oppo_y,
        #     ball_x, ball_y,
        #     last4_x, last4_y,
        #     last3_x, last3_y,
        #     last2_x, last2_y,
        #     ball_round,  velocity, type,
        #     pair_name, match_name
        # ])
        hit_area_heatmap_info_csv_writer.writerow([
            set_index, scoreA, scoreB,
            my_x, my_y,
            oppo_x, oppo_y,
            ball_x, ball_y,
            last4_x, last4_y,
            last3_x,last3_y,
            last2_x, last2_y,
            ball_round, velocity, type,
            pair_name, match_name
        ])

    # for i in range(len(loss_heatmap)):
    #     for j in range(len(loss_heatmap[i])):
    #         for k in range(len(loss_heatmap[i][j])):
    #             for l in range(len(loss_heatmap[i][j][k])):
    #                 map = loss_heatmap[i][j][k][l]
    #                 map_info = loss_heatmap_info[i][j][k][l]
    #                 loss_heatmap_csv_writer.writerow(
    #                     [i, j, k, l, map[0][0], map[0][1], map[0][2], map[1][0], map[1][1], map[1][2], map[2][0],
    #                      map[2][1], map[2][2]])
    #                 for row_map_info_x in range(len(map_info)):
    #                     for col_y in range(len(map_info[row_map_info_x])):
    #                         for data in map_info[row_map_info_x][col_y]:
    #                             last_3_balls, hit_point, hit_point_opponent, hit_point_ball, set_index = data
    #                             if last_3_balls[0] == []:
    #                                 last4_x, last4_y = None, None
    #                             else:
    #                                 last4_x, last4_y = last_3_balls[0]
    #                             if last_3_balls[1] == []:
    #                                 last3_x, last3_y = None, None
    #                             else:
    #                                 last3_x, last3_y = last_3_balls[1]
    #                             if last_3_balls[2] == []:
    #                                 last2_x, last2_y = None, None
    #                             else:
    #                                 last2_x, last2_y = last_3_balls[2]
    #                             match_name = hit_point[-1]
    #                             video_name = hit_point[0]
    #                             ball_round = hit_point[2]  # 第幾球
    #                             # set_index = hit_point[1]
    #                             scoreA = hit_point[11]
    #                             scoreB = hit_point[12]
    #                             if shift_state == True:
    #                                 if video_name == 'Anthony_Sinisuka_GINTING_CHOU_Tien_Chen_Hong_Kong_Open_2019_Quarter_Finals' or \
    #                                                 video_name == 'Kento_MOMOTA_CHOU_Tien_Chen_Fuzhou_Open_2019_Finals' or \
    #                                                 video_name == 'CHOU_Tien_Chen_Anders_ANTONSEN_Fuzhou_Open_2019_Semi-finals' or \
    #                                                 video_name == 'CHOU_Tien_Chen_Anders_ANTONSEN_Fuzhou_Open_2019_Semi-finals' or \
    #                                                 video_name == 'CHOU_Tien_Chen_Anders_ANTONSEN_China_Open_2019_QuarterFinal' or \
    #                                                 video_name == 'CHEN_Long_CHOU_Tien_Chen_World_Tour_Finals_Group_Stage':
    #                                     temp_next_score1 = str(set_index + 1) + '_' + str(int(scoreA) + 1).zfill(
    #                                         2) + '_' + str(int(scoreB)).zfill(2) + '.mp4'
    #                                     temp_next_score2 = str(set_index + 1) + '_' + str(int(scoreA)).zfill(
    #                                         2) + '_' + str(
    #                                         int(scoreB) + 1).zfill(2) + '.mp4'
    #                                     if temp_next_score1 in os.listdir('round_results/' + video_name):
    #                                         store_video_name = video_name + '/' + temp_next_score1
    #                                     elif temp_next_score2 in os.listdir('round_results/' + video_name):
    #                                         store_video_name = video_name + '/' + temp_next_score2
    #                                 else:
    #                                     store_video_name = video_name + '/' + str(set_index + 1) + '_' + str(
    #                                         scoreA).zfill(2) + '_' + str(scoreB).zfill(2) + '.mp4'
    #                             else:
    #                                 store_video_name = video_name + '/' + str(set_index) + '_' + str(
    #                                     scoreA) + '_' + str(scoreB) + '.mp4'
    #                             oppo_x = hit_point_opponent[8]
    #                             oppo_y = hit_point_opponent[9]
    #                             my_x = hit_point[9]
    #                             my_y = hit_point[10]
    #                             ball_x = hit_point_ball[8]
    #                             ball_y = hit_point_ball[9]
    #                             type = hit_point[7]
    #                             if float(ball_y) < 469 and float(my_y) < 469:
    #                                 continue
    #                             if float(ball_y) >= 469 and float(my_y) >= 469:
    #                                 continue
    #                             if (float(hit_point_ball[2]) - float(hit_point[3])) < 3:
    #                                 continue
    #                             velocity = dis2([float(ball_x) / 7, float(ball_y) / 7],
    #                                             [float(my_x) / 7, float(my_y) / 7]) / (float(hit_point_ball[2]) - float(
    #                                 hit_point[3]))
    #                             velocity = velocity * 30 / 10 * 3600 / 1000  # 公里 / 小時
    #                             loss_heatmap_info_csv_writer.writerow(
    #                                 [i, j, k, l, row_map_info_x, col_y, match_name, set_index, scoreA, scoreB, last4_x,
    #                                  last4_y, last3_x, last3_y, last2_x, last2_y, oppo_x, oppo_y, my_x, my_y, ball_x,
    #                                  ball_y, velocity, type, store_video_name, ball_round])


if __name__ == '__main__':

    player = 'B'
    pair_name = 'Kento_MOMOTA_Viktor_AXELSEN'
    match_name = 'Malaysia_Masters_2020_Finals'
    cal_heatmap(player, pair_name, match_name)

    player = 'ViktorAXELSEN'
    opponent = 'KentoMOMOTA'

    write_heatmap_csv(player, opponent)
