let vm = {}
var fetch_data;
new Promise((resolve) => {
    resolve(dataLoad(vm));
})
    .then(resolve => {
    d3InitSet(vm);
})

const sum = (x, y) => x + y;
const square = x => x * x;

var raw_data;
var data_left = [];
var data_right = [];
var player_selected = '';
var opponent_selected = '';
var opponent_list = [];
var player_selected_right = '';
var opponent_selected_right = '';
var opponent_list_right = [];
var display_heatmap_type = '';
var display_heatmap_type_right = '';
var display_click_heatmap_type = '';
var isDragging = '';

var max_velocity = 100;

var dot_radius = 5.5;
var dot_opacity = 0.6;
var path_opacity = 0.5;
var path_line_opacity = 0.5;
var region_filter_state = 'Off';
var hit_circles = '';
var hit_circles_right = '';
var last_hit_circles = '';
var last_hit_circles_right = '';
var landing = 'top';
var id_list = ['opponent', 'me'];
var top_lens_left = [160, 240];
var top_lens_right = [160, 240];
var bot_lens_left = [220, 620];
var bot_lens_right = [220, 620];
var lens_radius = 80;
var arrow_left1 = '';
var arrow_left2 = '';
var tension = 1.2;
var similarity = 0.88;
var arrow_size = 25;

const court_width = 61;
const court_height = 67;
const side_height = 48;
const ey = 6;
var side_y = findSideHeight(2.6);

const region_count = 4;
const region_width = court_width / region_count * 5;
const region_height = court_height / region_count * 5;
let regions = [];
for(let i = 0; i < region_count; i++) {
    for(let j = 0; j < region_count; j++) {
        regions.push([region_width / 2 + region_width * j, region_height / 2 + region_height * i]);
    }
}
let group_center = [];
for(let i = 0; i < 2; i++) {
    for(let j = 0; j < 3; j++) {
        group_center.push(reverse(court_width / 4 * (i * 2 + 1) * 5, court_height / 6 * (j * 2 + 1) * 5))
    }
}
let windows = [];
for(let i = 0; i < region_count * 2 - 1; i++) {
    for(let j = 0; j < region_count * 2 - 1; j++) {
        windows.push([region_width / 2 * (j + 1), region_height / 2 * (i + 1)]);
    }
}

let reversed_regions = regions.map(p => reverse(p[0], p[1]));
let reversed_windows = windows.map(p => reverse(p[0], p[1]));

let left_hitmap = [];
let left_distrib = [];
let left_count = [];
let left_last_hitmap = [];
let left_last_count = [];
let left_entropy = [];
let left_colormap = new Array(windows.length).fill('');
let right_hitmap = [];
let right_distrib = [];
let right_count = [];
let right_last_hitmap = [];
let right_last_count = [];
let right_entropy = [];
let right_colormap = new Array(windows.length).fill('');
for(let i = 0; i < regions.length; i++) {
    left_hitmap.push([]);
    left_distrib.push([]);
    left_count.push(new Array(regions.length).fill(0));
    right_hitmap.push([]);
    right_distrib.push([]);
    right_count.push(new Array(regions.length).fill(0));
    left_last_hitmap.push([]);
    left_last_count.push(new Array(regions.length).fill(0));
    left_entropy.push(new Array(regions.length).fill(0));
    right_last_hitmap.push([]);
    right_last_count.push(new Array(regions.length).fill(0));
    right_entropy.push(new Array(regions.length).fill(0));
    for(let j = 0; j < regions.length; j++) {
        left_hitmap[i].push(new Array(regions.length).fill(0));
        left_distrib[i].push(new Array(regions.length).fill(0));
        right_hitmap[i].push(new Array(regions.length).fill(0));
        right_distrib[i].push(new Array(regions.length).fill(0));
        left_last_hitmap[i].push(new Array(windows.length).fill(''));
        right_last_hitmap[i].push(new Array(windows.length).fill(''));
    }
}

var variety_list = [];
var left_entropy_list = [];
var right_entropy_list = [];
var total_ball_count = 0;
var total_velocity = [];

var bundled_paths = [];
var bundled_paths_right = [];

function sigmoid(t, sig_k) {
    return 1 / (1 + Math.exp(-((t - sig_k * 2) / sig_k)));
}

function dis_2d(x1, y1, x2, y2) {
    var a = x2 - x1;
    var b = y2 - y1;
    return Math.sqrt(a * a + b * b);
}

function normalize(x1, y1, x2, y2, scale) {
    const x = x2 - x1;
    const y = y2 - y1;
    const length = Math.sqrt(x * x + y * y);
    return [x / length * scale, y / length * scale];
}

function findSideHeight(h) {
    return side_height * 5 - (h * 5);
}

function reverse(x, y) {
    return [61 * 5 - x, 67 * 5 - y + 67 * 5];
}

function isStart(x, y) {
    return x == 0 || x == 670 || y == 0 || y == 670;
}

function findIntersection(r, h, k, m, n) {
    // circle: (x - h)^2 + (y - k)^2 = r^2
    // line: y = m * x + n
    // r: circle radius
    // h: x value of circle centre
    // k: y value of circle centre
    // m: slope
    // n: y-intercept

    // get a, b, c values
    var a = 1 + m * m;
    var b = -h * 2 + (m * (n - k)) * 2;
    var c = h * h + (n - k) * (n - k) - r * r;

    // get discriminant
    var d = b * b - 4 * a * c;
    if (d >= 0) {
        // var intersections = [
        //     (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a),
        //     (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a)
        // ];
        var intersection1x = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
        var intersection2x = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
        var intersections = [
            [intersection1x, m * intersection1x + n],
            [intersection2x, m * intersection2x + n],
        ];
        if (d == 0) {
            return [intersections[0], m * intersections[0] + n];
        }
        return intersections;
    }
    return ['', ''];
}

function cosinesim(A, B){
    var dotprod = 0;
    var mA = 0;
    var mB = 0;
    for(i = 0; i < A.length; i++) {
        dotprod += (A[i] * B[i]);
        mA += (A[i] * A[i]);
        mB += (B[i] * B[i]);
    }
    mA = Math.sqrt(mA);
    mB = Math.sqrt(mB);
    return dotprod / (mA *mB);
}

function findCirclepoint(x2, y2, x4, y4, cx, cy) {
    const m = (y2 - y4) / (x2 - x4);
    const n = y2 - (y2 - y4) / (x2 - x4) * x2;
    const inter = findIntersection(lens_radius, cx, cy, m, n);
    let circlepoint = [0, 0];
    if(inter[0] && inter[1]) {
        circlepoint = dis_2d(x2, y2, inter[0][0], inter[0][1]) < dis_2d(x2, y2, inter[1][0], inter[1][1]) 
        ? [inter[0][0], inter[0][1]] 
        : [inter[1][0], inter[1][1]];
    }
    return circlepoint;
}

function entropy(str) {
    const len = str.length
    // Build a frequency map from the string.
    const frequencies = Array.from(str)
        .reduce((freq, c) => (freq[c] = (freq[c] || 0) + 1) && freq, {})
    
    // Sum the frequency of each character.
    return Object.values(frequencies)
        .reduce((sum, f) => sum - f/len * Math.log2(f/len), 0)
}

function rotate(vec, ang, out_len) {
    ang = -ang * (Math.PI / 180);
    var cos = Math.cos(ang);
    var sin = Math.sin(ang);
    var len = Math.sqrt((vec[0] * vec[0]) + (vec[1] * vec[1]));
    var scale = out_len / len;
    return new Array((Math.round(10000*(vec[0] * cos - vec[1] * sin))/10000)*scale, (Math.round(10000*(vec[0] * sin + vec[1] * cos))/10000*scale));
}

function inRegion(x, y, location) {
    if (location == 'top') {
        for(let i = 0; i < regions.length; i++) {
            if(x > regions[i][0] - region_width / 2 && x < regions[i][0] + region_width / 2
                && y > regions[i][1] - region_height / 2 && y < regions[i][1] + region_height / 2) {
                    return i;
            }
        }
    } else if (location == 'bot') {
        for(let i = 0; i < reversed_regions.length; i++) {
            if(x > reversed_regions[i][0] - region_width / 2 && x < reversed_regions[i][0] + region_width / 2
                && y > reversed_regions[i][1] - region_height / 2 && y < reversed_regions[i][1] + region_height / 2) {
                    return i;
            }
        }
    }  
}

function inWindow(x, y, location) {
    const inWindows = [];
    if (location == 'top') {
        for(let i = 0; i < windows.length; i++) {
            if(x > (windows[i][0] - region_width / 2) && x < (windows[i][0] + region_width / 2) &&
                y > (windows[i][1] - region_height / 2) && y < (windows[i][1] + region_height / 2)) {
                    inWindows.push(i);
            }
        }
    } else if (location == 'bot') {
        for(let i = 0; i < reversed_windows.length; i++) {
            if(x > (reversed_windows[i][0] - region_width / 2) && x < (reversed_windows[i][0] + region_width / 2) &&
                y > (reversed_windows[i][1] - region_height / 2) && y < (reversed_windows[i][1] + region_height / 2)) {
                    inWindows.push(i);
            }
        }
    }
    return inWindows;
}

function inGroup(x, y, location) {
    if (location == 'top') {
        if (x <= court_width / 2 * 5) {
            if (y <= court_height / 3 * 5) {
                return 0;
            } else if (y > court_height / 3 * 5 && y <= court_height / 3 * 2 * 5) {
                return 1;
            } else if (y > court_height / 3 * 2 * 5) {
                return 2;
            }
        } else if  (x > court_width / 2 * 5) {
            if (y <= court_height / 3 * 5) {
                return 3;
            } else if (y > court_height / 3 * 5 && y <= court_height / 3 * 2 * 5) {
                return 4;
            } else if (y > court_height / 3 * 2 * 5) {
                return 5;
            }
        }
    } else if (location == 'bot') {
        if (x <= reverse(court_width / 2 * 5, 0)[0]) {
            if (y <= reverse(0, court_height / 3 * 5)[1]) {
                return 5;
            } else if (y > reverse(0, court_height / 3 * 5)[1] && y <= reverse(0, court_height / 3 * 2 * 5)[1]) {
                return 4;
            } else if (y > reverse(0, court_height / 3 * 2 * 5)[1]) {
                return 3;
            }
        } else if (x > reverse(court_width / 2 * 5, 0)[0]) {
            if (y <= reverse(0, court_height / 3 * 5)[1]) {
                return 2;
            } else if (y > reverse(0, court_height / 3 * 5)[1] && y <= reverse(0, court_height / 3 * 2 * 5)[1]) {
                return 1;
            } else if (y > reverse(0, court_height / 3 * 2 * 5)[1]) {
                return 0;
            }
        }
    }
}

function freqchar(str) {
    let max = 0;
    let maxChar = '';
    str.split('').forEach(function(char){
    if(str.split(char).length > max) {
        max = str.split(char).length;
        maxChar = char;
        }
    });
    return maxChar;
};

function dataLoader(player, opponent, data, opponent_list) {
    if(opponent == 'all') {
        opponent_list.forEach(oppo => {
            const table = raw_data[`${player}_${oppo}`]
            table.forEach(row => {
                var {
                    set, scoreA, scoreB,
                    player_x, player_y, opponent_x, opponent_y, hit_x, hit_y,
                    last4_x, last4_y, last3_x, last3_y, last2_x, last2_y,
                    ball_round, velocity,
                    pair_name, match_name
                } = row;
                var info = [set, scoreA, scoreB,
                player_x, player_y, opponent_x, opponent_y, hit_x, hit_y,
                last4_x, last4_y, last3_x, last3_y, last2_x, last2_y,
                ball_round, velocity,
                pair_name, match_name];
                data.push(info);
            });
        })
    } else {
        const table = raw_data[`${player}_${opponent}`]
        table.forEach(row => {
            var {
                set, scoreA, scoreB,
                player_x, player_y, opponent_x, opponent_y, hit_x, hit_y,
                last4_x, last4_y, last3_x, last3_y, last2_x, last2_y,
                ball_round, velocity,
                pair_name, match_name
            } = row;
            var info = [set, scoreA, scoreB,
            player_x, player_y, opponent_x, opponent_y, hit_x, hit_y,
            last4_x, last4_y, last3_x, last3_y, last2_x, last2_y,
            ball_round, velocity,
            pair_name, match_name];
            data.push(info);
        });
    }
}

function dataLoad(vm) {
    ~async function() {
        fetch_data = await fetch('http://140.113.24.2:5502/getData', {method: "GET"})
            .then(response => {
                console.log('data loded.');
                return response.json();
            })
            .then(function(result) {
                raw_data = result;

                let p = document.getElementById("left-player-select");
                let p2 = document.getElementById("right-player-select");
                let player_list = [];

                const tables = Object.keys(raw_data);
                tables.forEach(table => {
                    const [player, opponent] = table.split('_');
                    if(!player_list.includes(player)) {
                        player_list.push(player);
                        var option = document.createElement("option");
                        option.text = player;
                        option.value = player;
                        option.id = 'player_option';
                        p.add(option);
                        var option = document.createElement("option");
                        option.text = player;
                        option.value = player;
                        option.id = 'player_option';
                        p.add(option);
                        p2.add(option);
                    }
                    total_ball_count += raw_data[table].length;
                    raw_data[table].forEach(row => {
                        total_velocity.push(row.velocity);
                    })
                })
                // const total_ball_count = total_ball_counts.reduce(sum);
                const mean = total_velocity.reduce(sum) / total_ball_count;
                const dev = total_velocity.map(x => x - mean);
                const stddev = Math.sqrt(dev.map(square).reduce(sum) / (total_ball_count - 1));
                max_velocity = mean + stddev * 2;
            });
    }();
}

function d3InitSet(vm){
    vm.width = court_width * 5;
    vm.height = court_height * 2 * 5;
    vm.side_height = side_height * 5;
    vm.svg_left = d3.select("#left_heatmap")
        .append("svg")
        .attr("id", 'left_heatmap_svg')
        .attr("width", vm.width)
        .attr("height", vm.height)
        .on('mouseenter', function() {
            document.getElementById("histogram").style.display = 'block';
        })
        .on('mouseleave', function() {
            document.getElementById("histogram").style.display = 'none';
        })
        .on('mousemove', function() {
            const coord = d3.mouse(vm.svg_left.node());
            // console.log() // log the mouse x,y position
            obj.draw_histogram(coord[0], coord[1]);
        });
    vm.svg_right = d3.select("#right_heatmap")
        .append("svg")
        .attr("id", 'right_heatmap_svg')
        .attr("width", vm.width)
        .attr("height", vm.height)
    vm.svg_left_side = d3.select("#left_sideview")
        .append("svg")
        .attr("id", 'left_sideview_svg')
        .attr("width", vm.height)
        .attr("height", vm.side_height)
    vm.svg_right_side = d3.select("#right_sideview")
        .append("svg")
        .attr("id", 'right_sideview_svg')
        .attr("width", vm.height)
        .attr("height", vm.side_height)
    vm.svg_hist = d3.select("#histogram")
        .append("svg")
        .attr("id", 'histogram_svg')
        .attr("width", 400)
        .attr("height", 300)
    
    groupColors = d3.scaleOrdinal(d3.schemeCategory10).domain([0, 5]);
    // linear = d3.scaleLinear()
    //     .range(["rgb(230, 230, 0)", "rgb(230 ,0 ,0)"])
    //     .domain([0, 100])
    //     .interpolate(d3.interpolateRgb)
    // linear = d3.scaleSequential()
    //     .domain([0, max_velocity])
    //     .interpolator(d3.interpolatePlasma)
    // d3.select('#legend').append('svg')
    //     .selectAll('legend_rect')
    //     .data(d3.range(100))
    //     .enter()
    //     .append('rect')
    //     .attr('x', (d, i) => i * 2)
    //     .attr('y', 0)
    //     .attr('width', 2)
    //     .attr('height', 10)
    //     .style('fill', (d, i) => linear(d))

    vm.svg_left.append('image')
        .attr("href", "court.svg")
        .attr('width', 61 * 5)
        .attr('height', 134 * 5)
        .attr('x', 0)
        .attr('y', 0)
    vm.svg_right.append('image')
        .attr("href", "court.svg")
        .attr('width', 61 * 5)
        .attr('height', 134 * 5)
        .attr('x',0)
        .attr('y',0)
    vm.svg_left_side.append('image')
        .attr("href", "side.svg")
        .attr('width', vm.height)
        .attr('height', vm.side_height)
        .attr('x', 0)
        .attr('y', 0)
    vm.svg_right_side.append('image')
        .attr("href", "side.svg")
        .attr('width', vm.height)
        .attr('height', vm.side_height)
        .attr('x', 0)
        .attr('y', 0)
    
    d3.selectAll("#me").remove();
    d3.selectAll("#opponent").remove();
    vm.svg_left.append("circle")
        .attr("cx", top_lens_left[0])
        .attr("cy", top_lens_left[1])
        .attr("r", lens_radius)
        .attr("id", 'opponent')
        .attr("class", 'lens')
        .attr("stroke", 'grey')
        .style('stroke-width', '2')
        .attr("fill-opacity", 0)
        .call(d3.drag()
            .on("start", obj.ondragstart)
            .on("drag", obj.ondrag)
            .on("end", obj.ondragend)
        );
    vm.svg_left.append("circle")
        .attr("cx", bot_lens_left[0])
        .attr("cy", bot_lens_left[1])
        .attr("r", lens_radius)
        .attr("id", 'me')
        .attr("class", 'lens')
        .attr("stroke", 'grey')
        .style('stroke-width', '2')
        .attr("fill-opacity", 0)
        .call(d3.drag()
            .on("start", obj.ondragstart)
            .on("drag", obj.ondrag)
            .on("end", obj.ondragend)
        );
    vm.svg_right.append("circle")
        .attr("cx", top_lens_right[0])
        .attr("cy", top_lens_right[1])
        .attr("r", lens_radius)
        .attr("id", 'opponent')
        .attr("class", 'lens')
        .attr("stroke", 'grey')
        .style('stroke-width', '2')
        .attr("fill-opacity", 0)
    vm.svg_right.append("circle")
        .attr("cx", bot_lens_right[0])
        .attr("cy", bot_lens_right[1])
        .attr("r", lens_radius)
        .attr("id", 'me')
        .attr("class", 'lens')
        .attr("stroke", 'grey')
        .style('stroke-width', '2')
        .attr("fill-opacity", 0)
    // vm.svg_left_side.append("ellipse")
    //     .attr("id", d => d.id)
    //     .attr("cx", d => d.y)
    //     .attr("cy", side_y)
    //     .attr("rx", lens_radius)
    //     .attr("ry", ey)
    //     .attr("fill", 'grey')
    //     .attr("fill-opacity", 0.8)
    // vm.svg_right_side.append("ellipse")
    //     .attr("id", d => d.id)
    //     .attr("cx", d => d.y)
    //     .attr("cy", side_y)
    //     .attr("rx", lens_radius)
    //     .attr("ry", ey)
    //     .attr("fill", 'grey')
    //     .attr("fill-opacity", 0.8)

    var hit_table = d3.select("#infoList").append("table")
        .attr("class", "table")
        .attr('id', 'hit_table')
    var header = hit_table.append("thead").append("tr")
        .selectAll("th")
        .data(["Match", "Game", "ScoreA", "ScoreB"])
        .enter()
        .append("th")
        .text(d => d)
        .on("click", (d, i) => {
            sortTable(document.getElementById("hit_table"), i, 0);
        });

    var loss_table = d3.select("#infoListLoss").append("table")
        .attr("class","table")
        .attr('id','loss_table')
    var loss_header = loss_table.append("thead").append("tr")
        .selectAll("th")
        .data(["Match", "Game", "ScoreA", "ScoreB"])
        .enter()
        .append("th")
        .text(d => d)
        .on("click", (d, i) => {
            sortTable(document.getElementById("loss_table"), i, 0);
        });

    var variety_table = d3.select("#varietyList").append("table")
        .attr("class", "table")
        .attr('id', 'variety_table')
    variety_table.append("thead").append("tr")
        .selectAll("th")
        // .data(["Variety of Shuttle Landing Distributions"])
        .enter()
        .append("th")
        .text(d => d);
    var left_entropy_table = d3.select("#leftEntropyList").append("table")
        .attr("class", "table")
        .attr('id', 'left-entropy-table')
    left_entropy_table.append("thead").append("tr")
        .selectAll("th")
        // .data(["Consistency"])
        .enter()
        .append("th")
        .text(d => d);
    var right_entropy_table = d3.select("#rightEntropyList").append("table")
        .attr("class", "table")
        .attr('id', 'right-entropy-table')
    right_entropy_table.append("thead").append("tr")
        .selectAll("th")
        // .data(["Consistency"])
        .enter()
        .append("th")
        .text(d => d);

    for(let i = 0; i < 6; i++) {
        vm.svg_left.append('defs').append('radialGradient')
            .attr('id', 'grad' + i)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('cx', bot_lens_left[0])
            .attr('cy', bot_lens_left[1])
            .attr('r', lens_radius * 6)
        vm.svg_left.select('#grad' + i).append('stop')
            .attr('offset', '12%')
            // .attr('stop-color', 'silver')
            .attr('stop-color', `rgba(192, 192, 192, ${path_opacity - 0.2})`)
        vm.svg_left.select('#grad' + i).append('stop')
            .attr('offset', '25%')
            .attr('stop-color', groupColors(i));
        vm.svg_right.append('defs').append('radialGradient')
            .attr('id', 'grad2' + i)
            .attr('gradientUnits', 'userSpaceOnUse')
            .attr('cx', bot_lens_right[0])
            .attr('cy', bot_lens_right[1])
            .attr('r', lens_radius * 6)
        vm.svg_right.select('#grad2' + i).append('stop')
            .attr('offset', '12%')
            // .attr('stop-color', 'silver')
            .attr('stop-color', `rgba(192, 192, 192, ${path_opacity - 0.2})`)
        vm.svg_right.select('#grad2' + i).append('stop')
            .attr('offset', '25%')
            .attr('stop-color', groupColors(i));
    }
    updateFilterState(3);
}

var obj = {
    ondragstart : function (d) {
        d3.select(this).raise().classed("active", true);
        d3.selectAll("#last_path").remove();
        d3.selectAll("#last_path_text").remove();
        d3.selectAll("#mouseover_text").remove();
        d3.selectAll("#hit_table_body").remove();
        d3.selectAll("#loss_table_body").remove();
        d3.selectAll(".window").remove();
        isDragging = d3.event.y < 67 * 5 ? 'top' : 'bot';
        if (player_selected == '' || opponent_selected_right == '' || player_selected_right == '' || opponent_selected_right == '') {
            return;
        }
    },
    ondrag : function (d) {
        if (isDragging == 'top' && d3.event.y < 67*5 && d3.event.y >= 0 && d3.event.x >= 0 && d3.event.x < 61*5){
            obj.update_lens(d3.event.x, d3.event.y);
        }
        else if (isDragging == 'bot' && d3.event.y >= 67 * 5 && d3.event.y <= 134 * 5 && d3.event.x >= 0 && d3.event.x < 61 * 5) {
            obj.update_lens(d3.event.x, d3.event.y);
        }
        if (arrow_left1 != '') {
            obj.draw_map_left(false);
            obj.draw_map_right(false);
        }
    },
    ondragend : function (d) {
        d3.select(this).classed("active", false);
        if (isDragging == 'top' && d3.event.y < 67 * 5 && d3.event.y >= 0 && d3.event.x >= 0 && d3.event.x < 61 * 5){
            obj.update_lens(d3.event.x, d3.event.y);
        }
        else if (isDragging == 'bot' && d3.event.y >= 67 * 5 && d3.event.y >= 0 && d3.event.x >= 0 && d3.event.x < 61 * 5){
            obj.update_lens(d3.event.x, d3.event.y);
        }
        if (arrow_left1 != '') {
            obj.draw_map_left(true);
            obj.draw_map_right(true);
        }
        isDragging = '';
    },
    update_lens: function(x, y) {
        if (isDragging == 'top') {
            vm.svg_left.select("#opponent")
                .attr("cx", x)
                .attr("cy", y)
            vm.svg_right.select("#opponent")
                .attr("cx", x)
                .attr("cy", y)
            vm.svg_right.select("#me")
                .attr("cx", bot_lens_left[0])
                .attr("cy", bot_lens_left[1])
            // vm.svg_left_side.select("#opponent")
            //     .attr("cx", y)
            // vm.svg_right_side.select("#opponent")
            //     .attr("cx", y)
            top_lens_left[0] = x;
            top_lens_left[1] = y;
            top_lens_right[0] = x;
            top_lens_right[1] = y;
            bot_lens_right[0] = bot_lens_left[0];
            bot_lens_right[1] = bot_lens_left[1];
        } else if (isDragging == 'bot') {
            vm.svg_right.select("#me")
                .attr("cx", x)
                .attr("cy", y)
            vm.svg_left.select("#me")
                .attr("cx", x)
                .attr("cy", y)
            vm.svg_right.select("#top")
                .attr("cx", top_lens_left[0])
                .attr("cy", top_lens_left[1])
            // vm.svg_left_side.select("#me")
            //     .attr("cx", y)
            // vm.svg_right_side.select("#me")
            //     .attr("cx", y)
            top_lens_right[0] = top_lens_left[0];
            top_lens_right[1] = top_lens_left[1];
            bot_lens_left[0] = x;
            bot_lens_left[1] = y;
            bot_lens_right[0] = x;
            bot_lens_right[1] = y;
        }
        obj.update_arrow();
    },
    get_reverse_coord : function (opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing){
        var ball_region = '';
        if (hit_y > 67 * 5){
            ball_region = 'bot';
        }
        else if (hit_y <= 67 * 5){
            ball_region = 'top';
        }
        if (ball_region != landing){
            return [reverse(opponent_x, opponent_y), reverse(player_x, player_y), reverse(hit_x, hit_y)];
        }
        else {
            return [[opponent_x, opponent_y], [player_x, player_y], [hit_x, hit_y]];
        }
    },
    get_reverse_coord_6 : function (last4_x,last4_y,last3_x,last3_y,last2_x,last2_y,opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing){
        var ball_region = '';
        if (hit_y > 67 * 5){
            ball_region = 'bot';
        }
        else if (hit_y <= 67 * 5){
            ball_region = 'top';
        }
        if (ball_region != landing){
            return [
                reverse(last4_x,last4_y), reverse(last3_x,last3_y), reverse(last2_x,last2_y),
                reverse(opponent_x,opponent_y), reverse(player_x,player_y), reverse(hit_x,hit_y)
            ];
        }
        else {
            return [
                [last4_x,last4_y], [last3_x,last3_y], [last2_x,last2_y],
                [opponent_x,opponent_y], [player_x,player_y], [hit_x,hit_y]
            ];
        }
    },
    draw_map_left : function (is_table_update) {
        const all_hit_returns = obj.find_inside_hits();
        const inlens_hits = all_hit_returns[0];
        const info_list = all_hit_returns[1];
        const file_list = all_hit_returns[2];
        const last_5_hits = all_hit_returns[3];
        const velocity_list = all_hit_returns[4];
        const index_list = all_hit_returns[5];
        const total_index = all_hit_returns[6];
        const round_list = all_hit_returns[7];
        const colormap = all_hit_returns[8];
        const lastIsStart = (d, b) => last_5_hits[d][b][0] == 0 || last_5_hits[d][b][0] == 670 || 
        last_5_hits[d][b][1] == 0 || last_5_hits[d][b][1] == 670;
        var lines = d3.line();
       
        vm.svg_left.selectAll("#last_path_text").remove();
        vm.svg_left.selectAll("#hit_circles").remove();
        vm.svg_left.selectAll("#comet_tail").remove();
        vm.svg_left.selectAll("#path_circles").remove();
        vm.svg_left.selectAll("#path_lines").remove();
        vm.svg_left.selectAll("#color_window").remove();
        // vm.svg_left_side.selectAll("#side_lines").remove();

        for(let i = 0; i < 6; i ++) {
            vm.svg_left.select(`#grad${i}`)
                .attr('cx', bot_lens_left[0])
                .attr('cy', bot_lens_left[1])
                // .attr('fx', bot_lens_left[0])
                // .attr('fy', bot_lens_left[1])
                .attr('r', lens_radius * 6)
        }

        hit_circles = vm.svg_left.selectAll("hit_circles")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx', d => inlens_hits[d][0])
            .attr('cy', d => inlens_hits[d][1])
            // .attr('r', vm.dot_radius(data_left.length))
            .attr('r', dot_radius)
            // .attr('fill', d => vm.velocity_color(velocity_list[d] > max_velocity ? max_velocity : velocity_list[d]))
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id','hit_circles')
            .attr('class', d => 'c' + d)
            .style('opacity', dot_opacity)
            .on('mouseenter', function(d){
                d3.selectAll('.c' + d)
                    // .attr('r', vm.dot_radius(data_left.length) + 3)
                    .attr('r', dot_radius + 3)
                    .style('opacity', 1.0)
                d3.select("#hit_table").selectAll('.t' + d)
                    .style('background', "yellow")
                d3.selectAll('.p' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                d3.selectAll('.s' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                vm.svg_left.selectAll('#mouseover_text').remove();
                vm.svg_left.append('text')
                    .attr('x', 5)
                    .attr('y', 20)
                    .style('font-size', '20px')
                    .style('font-weight', 'bold')
                    .attr('id','mouseover_text')
                    .text(info_list[d])
            })
            .on('mouseleave', function(d){
                d3.selectAll('.c' + d)
                    // .attr('r', vm.dot_radius(data_left.length))
                    .attr('r', dot_radius)
                    .style('opacity', dot_opacity)
                d3.select("#hit_table").selectAll('.t' + d)
                    .style('background', "none")
                d3.selectAll('.p' + d)
                    .style('stroke-width', 2)
                    .style('opacity', dot_opacity - 0.3)
                d3.selectAll('.s' + d)
                    .style('stroke-width', 2)
                    .style('opacity', dot_opacity - 0.3)
                d3.selectAll('#mouseover_text').remove();
            })
            .on('click', function(d) {
                d3.select(this).on("mouseleave", null);
                vm.svg_left.selectAll('#hit_circles')
                    // .attr('r', vm.dot_radius(data_left.length))
                    .attr('r', dot_radius)
                    .style('opacity', 0.3)
                vm.svg_left.selectAll('#path_circles')
                    // .attr('r', vm.dot_radius(data_left.length))
                    .attr('r', dot_radius)
                    .style('opacity', 0.3)
                vm.svg_left.selectAll('#path_lines')
                    .style('stroke-width', 3)
                    .style('opacity', 0.3)
                vm.svg_left_side.selectAll('#side_lines')
                    .style('stroke-width', 3)
                    .style('opacity', 0.3)
                d3.selectAll('.c' + d)
                    // .attr('r', vm.dot_radius(data_left.length) + 3)
                    .attr('r', dot_radius + 3)
                    .style('opacity', 1.0)
                d3.selectAll("#hit_row").style('background', 'none')
                d3.select("#hit_table").selectAll('.t' + d)
                    .style('background', "yellow")
                d3.selectAll('.p' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                d3.selectAll('.s' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                vm.svg_left.selectAll("#last_path").remove();
                vm.svg_left.selectAll("#last_path_text").remove();
                for(let it=0; it<6; it++) {
                    if((round_list[d] - 4 + it) > 0){
                        vm.svg_left.append('text')
                        .attr('x', last_5_hits[d][it][0])
                        .attr('y', last_5_hits[d][it][1])
                        .style('font-size', '20px')
                        .style('font-weight', 'bold')
                        .attr('id','last_path_text')
                        .text((round_list[d] - 4 + it))
                    }
                }
                // hit_circles_text = vm.svg_left.selectAll("last_path_text")
                //     .data([0,1,2,3,4,5])
                //     .enter()
                //     .append('text')
                //     .attr('x', d2 => last_5_hits[d][d2][0])
                //     .attr('y', d2 => last_5_hits[d][d2][1])
                //     .style('font-size', '20px')
                //     .style('font-weight', 'bold')
                //     .attr('id','last_path_text')
                //     .text(d2 => round_list[d] - 4 + d2)
                filepath = './raw/'+ file_list[d];
                console.log(filepath);
                var video_tag = document.getElementById('video_id');
                video_tag.src = filepath;
                video_tag.play();
            });
        
        const radius = dot_radius - 1;
        comet_tail = vm.svg_left.selectAll("comet_tail")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx', d => inlens_hits[d][0] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius + 1
            )[0])
            .attr('cy', d => inlens_hits[d][1] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius + 1
            )[1])
            // .attr('r', vm.dot_radius(data_left.length) - 1)
            .attr('r', dot_radius - 1)
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id','comet_tail')
            .attr('class', 'c')
            .style('opacity', dot_opacity - 0.3)
        comet_tail2 = vm.svg_left.selectAll("comet_tail")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx', d => inlens_hits[d][0] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 2 + 1
            )[0])
            .attr('cy', d => inlens_hits[d][1] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 2 + 1
            )[1])
            // .attr('r', vm.dot_radius(data_left.length) - 1.5)
            .attr('r', dot_radius - 1.5)
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id', 'comet_tail')
            .attr('class', 'c')
            .style('opacity', d => velocity_list[d] > max_velocity / 5 * 2 ? dot_opacity - 0.3 : 0)
        comet_tail3 = vm.svg_left.selectAll("comet_tail")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx', d => inlens_hits[d][0] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 3 + 1
            )[0])
            .attr('cy', d => inlens_hits[d][1] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 3 + 1
            )[1])
            // .attr('r', vm.dot_radius(data_left.length) - 2)
            .attr('r', dot_radius - 2)
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id', 'comet_tail')
            .attr('class', 'c')
            .style('opacity', d => velocity_list[d] > max_velocity / 5 * 3 ? dot_opacity - 0.4 : 0)
        comet_tail4 = vm.svg_left.selectAll("comet_tail")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx', d => inlens_hits[d][0] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 4 + 1
            )[0])
            .attr('cy', d => inlens_hits[d][1] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 4 + 1
            )[1])
            // .attr('r', vm.dot_radius(data_left.length) - 2)
            .attr('r', dot_radius - 2)
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id', 'comet_tail')
            .attr('class', 'c')
            .style('opacity', d => velocity_list[d] > max_velocity / 5 * 4 ? dot_opacity - 0.4 : 0)

        const isLastPath = document.getElementById("toggle-lastpath").checked;
        const isColorMap = document.getElementById("toggle-colormap").checked;

        if(isLastPath) {
            bundled_paths = [];
            const bundles = [];
            index_list.forEach((d, index) => {
                const x4 = last_5_hits[d][4][0];
                const y4 = last_5_hits[d][4][1];
                const x2 = last_5_hits[d][2][0];
                const y2 = last_5_hits[d][2][1];
                const group = inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top');
                if(!isStart(x2, y2) && !isStart(x4, y4)) {
                    if(dis_2d(x2, y2, bot_lens_left[0], bot_lens_left[1]) <= lens_radius) {
                        var lineData = {
                            index: index,
                            g: group,
                            path: [
                                [x2, y2],
                                [x4, y4],
                            ]
                        };
                        bundled_paths.push(lineData);
                    } else {
                        const circlepoint = findCirclepoint(x2, y2, x4, y4, bot_lens_left[0], bot_lens_left[1]);
                        if(bundles.length === 0) {
                            bundles.push({
                                lines: [
                                    [
                                        [x4, y4],
                                        [x2, y2],
                                        group,
                                        index,
                                    ]
                                ],
                                center4: [x4, y4],
                                center2: [x2, y2],
                                circlepoint,
                            })
                        } else {
                            let found = false;
                            for(let i = 0; i < bundles.length; i++) {
                                const vector = normalize(bundles[i].circlepoint[0], bundles[i].circlepoint[1], bot_lens_left[0], bot_lens_left[1], 1);
                                const new_vector = normalize(circlepoint[0], circlepoint[1], bot_lens_left[0], bot_lens_left[1], 1);
                                if(cosinesim(vector, new_vector) > similarity) {
                                    bundles[i].center4 = [
                                        (bundles[i].center4[0] * bundles[i].lines.length + x4) / (bundles[i].lines.length + 1),
                                        (bundles[i].center4[1] * bundles[i].lines.length + y4) / (bundles[i].lines.length + 1)
                                    ];
                                    bundles[i].center2  = [
                                        (bundles[i].center2[0] * bundles[i].lines.length + x2) / (bundles[i].lines.length + 1),
                                        (bundles[i].center2[1] * bundles[i].lines.length + y2) / (bundles[i].lines.length + 1)
                                    ]
                                    bundles[i].circlepoint = findCirclepoint(bundles[i].center2[0], bundles[i].center2[1], bundles[i].center4[0], bundles[i].center4[1],
                                        bot_lens_left[0], bot_lens_left[1]);
                                    bundles[i].lines.push([
                                        [x4, y4],
                                        [x2, y2],
                                        group,
                                        index,
                                    ])
                                    found = true;
                                    break;
                                }
                            }
                            if(!found) {
                                bundles.push({
                                    lines: [
                                        [
                                            [x4, y4],
                                            [x2, y2],
                                            group,
                                            index,
                                        ]
                                    ],
                                    center4: [x4, y4],
                                    center2: [x2, y2],
                                    circlepoint,
                                })
                            }
                        }
                    }
                }
            })
    
            bundles.forEach(bundle => {
                bundle.lines.forEach(line => {
                    if(bundle.circlepoint[0] !== 0 && bundle.circlepoint[1] !== 0) {
                        var lineData = {
                            index: line[3],
                            g: line[2],
                            path: [
                                [line[0][0], line[0][1]],
                                [bundle.circlepoint[0], bundle.circlepoint[1]],
                                [line[1][0], line[1][1]],
                            ]
                        };
                    } else {
                        var lineData = {
                            index: line[3],
                            g: line[2],
                            path: [
                                [line[0][0], line[0][1]],
                                [line[1][0], line[1][1]],
                            ]
                        };
                    }  
                    bundled_paths.push(lineData);
                })
            })
            obj.draw_path_lines();
    
            path_circles = vm.svg_left.selectAll("path_circles")
                .data(index_list)
                .enter()
                .append('circle')
                .attr('cx', d => lastIsStart(d, 4) ? 0 : last_5_hits[d][4][0])
                .attr('cy', d => lastIsStart(d, 4) ? 0 : last_5_hits[d][4][1])
                // .attr('r', vm.dot_radius(data_left.length))
                .attr('r', dot_radius)
                .attr('fill', 'silver')
                // .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
                .attr('id', 'path_circles')
                .attr('class', d => 'c' + d)
                .style('opacity', path_opacity - 0.2)
            path_circles2 = vm.svg_left.selectAll("path_circles")
                .data(index_list)
                .enter()
                .append('circle')
                .attr('cx', d => lastIsStart(d, 2) || lastIsStart(d, 4) ? 0 : last_5_hits[d][2][0])
                .attr('cy', d => lastIsStart(d, 2) || lastIsStart(d, 4) ? 0 : last_5_hits[d][2][1])
                .attr('r', dot_radius)
                .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
                .attr('id', 'path_circles')
                .attr('class', d => 'c' + d)
                .style('opacity', path_opacity)
        } else {
            if(!isColorMap) {
                path_circles = vm.svg_left.selectAll("path_circles")
                .data(index_list)
                .enter()
                .append('circle')
                .attr('cx', d => lastIsStart(d, 4) ? 0 : last_5_hits[d][4][0])
                .attr('cy', d => lastIsStart(d, 4) ? 0 : last_5_hits[d][4][1])
                .attr('r', dot_radius)
                .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
                .attr('id', 'path_circles')
                .attr('class', d => 'c' + d)
                .style('opacity', path_opacity)
            }
        }

        if(isColorMap) {
            colormap.forEach((c, d) => {
                if(freqchar(c)) {
                    let e = entropy(c);
                    // e = (3 - e) / 3;
                    e = (3 - e) * sigmoid(left_colormap[d].length, 2) * 0.75;
                    vm.svg_left.append("rect")
                        .attr("x", reversed_windows[d][0] - region_width / 2)
                        .attr("y", reversed_windows[d][1] - region_height / 2)
                        .attr("width", region_width)
                        .attr("height", region_height)
                        .attr("id", 'color_window')
                        .attr("class", 'w' + d)
                        .attr("fill", groupColors(freqchar(c)))
                        .attr("fill-opacity", 0.25 * e)
                }
            });
        }

        var side_paths = [];
            index_list.forEach((d, index) => {
                if(last_5_hits[d][4][1]) {
                    var lineData = {
                        index: index,
                        g: inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top'),
                        path: [
                            [inlens_hits[d][1], findSideHeight(12)],
                            [court_height * 5, findSideHeight(30)],
                            [last_5_hits[d][4][1], findSideHeight(17)],
                        ]
                    };
                    side_paths.push(lineData);
                }
            })
            var bundleLine = d3.line().curve(d3.curveBundle.beta(1));
            vm.svg_left_side.selectAll("side_lines")
                .data(side_paths)
                .enter()
                .append('path')
                .attr('id', 'side_lines')
                .attr('class', d => 's' + d.index)
                .attr("d", d => bundleLine(d.path))
                .style('stroke', d => groupColors(d.g))
                .style('stroke-width', '2')
                .style('fill', 'none')
                .style('opacity', path_opacity - 0.3)

        d3.selectAll("#hit_table_body").remove();
        if(is_table_update == true) {
            obj.update_left_info_table(index_list, info_list, last_5_hits, file_list, round_list);
        }
    },
    draw_map_right : function (is_table_update) {
        const all_hit_returns = obj.find_inside_hits_right();
        const inlens_hits = all_hit_returns[0];
        const info_list = all_hit_returns[1];
        const file_list = all_hit_returns[2];
        const last_5_hits = all_hit_returns[3];
        const velocity_list = all_hit_returns[4];
        const index_list = all_hit_returns[5];
        const total_index = all_hit_returns[6];
        const round_list = all_hit_returns[7];
        const colormap = all_hit_returns[8];
        const lastIsStart = (d, b) => last_5_hits[d][b][0] == 0 || last_5_hits[d][b][0] == 670 || 
            last_5_hits[d][b][1] == 0 || last_5_hits[d][b][1] == 670;
        var lines = d3.line();

        vm.svg_right.selectAll("#last_path_text").remove();
        vm.svg_right.selectAll("#hit_circles").remove();
        vm.svg_right.selectAll("#comet_tail").remove();
        vm.svg_right.selectAll("#path_circles").remove();
        vm.svg_right.selectAll("#path_lines").remove();
        vm.svg_right.selectAll("#color_window").remove();
        // vm.svg_right_side.selectAll("#side_lines").remove();

        for(let i = 0; i < 6; i ++) {
            vm.svg_right.select(`#grad2${i}`)
                .attr('cx', bot_lens_right[0])
                .attr('cy', bot_lens_right[1])
                // .attr('fx', bot_lens_left[0])
                // .attr('fy', bot_lens_left[1])
                .attr('r', lens_radius * 6)
        }

        hit_circles_right = vm.svg_right.selectAll("hit_circles")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx',d => inlens_hits[d][0])
            .attr('cy', d => inlens_hits[d][1])
            // .attr('r', vm.dot_radius(data_right.length))
            .attr('r', dot_radius)
            // .attr('fill', d => vm.velocity_color(velocity_list_right[d] > max_velocity ? max_velocity : velocity_list_right[d]))
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id','hit_circles')
            .attr('class', d => 'lc' + d)
            .style('opacity', path_opacity)
            .on('mouseenter', function(d) {
                d3.selectAll('.lc' + d)
                    // .attr('r', vm.dot_radius(data_right.length) + 3)
                    .attr('r', dot_radius + 3)
                    .style('opacity', 1.0)
                d3.selectAll('.lt' + d)
                    .style('background', "yellow")
                d3.selectAll('.lp' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                d3.selectAll('.ls' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                vm.svg_right.selectAll('#mouseover_text').remove();
                vm.svg_right.append('text')
                    .attr('x', 5)
                    .attr('y', 20)
                    .style('font-size', '20px')
                    .style('font-weight', 'bold')
                    .attr('id','mouseover_text')
                    .text(info_list[d])
            })
            .on('mouseleave', function(d){
                d3.selectAll('.lc' + d)
                    // .attr('r', vm.dot_radius(data_right.length))
                    .attr('r', dot_radius)
                    .style('opacity', path_opacity)
                d3.selectAll('.lt' + d)
                    .style('background', "none")
                d3.selectAll('.lp' + d)
                    .style('stroke-width', 2)
                    .style('opacity', path_opacity - 0.3)
                d3.selectAll('.ls' + d)
                    .style('stroke-width', 2)
                    .style('opacity', path_opacity - 0.3)
                d3.selectAll('#mouseover_text').remove();
            })
            .on('click', function(d) {
                d3.select(this).on("mouseleave", null);
                vm.svg_right.selectAll('#hit_circles')
                    // .attr('r', vm.dot_radius(data_left.length))
                    .attr('r', dot_radius)
                    .style('opacity', 0.3)
                vm.svg_right.selectAll('#path_circles')
                    // .attr('r', vm.dot_radius(data_right.length) + 3)
                    .attr('r', dot_radius)
                    .style('opacity', 0.3)
                vm.svg_right.selectAll('#path_lines')
                    .style('stroke-width', 3)
                    .style('opacity', 0.3)
                vm.svg_right_side.selectAll('#side_lines')
                    .style('stroke-width', 3)
                    .style('opacity', 0.3)
                d3.selectAll('.lc' + d)
                    // .attr('r', vm.dot_radius(data_left.length) + 3)
                    .attr('r', dot_radius + 3)
                    .style('opacity', 1.0)
                d3.selectAll("#loss_row")
                    .style('background', "none")
                d3.selectAll('.lt' + d)
                    .style('background-color', "yellow")
                d3.selectAll('.lp' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                d3.selectAll('.ls' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                vm.svg_right.selectAll("#last_path").remove();
                vm.svg_right.selectAll("#last_path_text").remove();
                hit_circles_text = vm.svg_right.selectAll("last_path_text")
                    .data([0,1,2,3,4,5])
                    .enter()
                    .append('text')
                    .attr('x', d2 => last_5_hits[d][d2][0])
                    .attr('y', d2 => last_5_hits[d][d2][1])
                    .style('font-size', '20px')
                    .style('font-weight', 'bold')
                    .attr('id','last_path_text')
                    .text(d2 => round_list[d] - 4 + d2)
                filepath = './raw/'+ file_list[d];
                console.log(filepath);
                var video_tag = document.getElementById('video_id');
                video_tag.src = filepath;
                video_tag.play();
            });
        // const radius = vm.dot_radius(data_right.length) - 1;
        const radius = dot_radius - 1;
        comet_tail = vm.svg_right.selectAll("comet_tail")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx', d => inlens_hits[d][0] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius + 1
            )[0])
            .attr('cy', d => inlens_hits[d][1] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius + 1
            )[1])
            // .attr('r', vm.dot_radius(data_right.length) - 1)
            .attr('r', dot_radius - 1)
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id','comet_tail')
            .attr('class', 'lc')
            .style('opacity', path_opacity - 0.3)
        comet_tail2 = vm.svg_right.selectAll("comet_tail")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx', d => inlens_hits[d][0] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 2 + 1
            )[0])
            .attr('cy', d => inlens_hits[d][1] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 2 + 1
            )[1])
            // .attr('r', vm.dot_radius(data_right.length) - 1.5)
            .attr('r', dot_radius - 1.5)
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id', 'comet_tail')
            .attr('class', 'lc')
            .style('opacity', d => velocity_list[d] > max_velocity / 5 * 2 ? path_opacity - 0.3 : 0)
        comet_tail3 = vm.svg_right.selectAll("comet_tail")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx', d => inlens_hits[d][0] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 3 + 1
            )[0])
            .attr('cy', d => inlens_hits[d][1] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 3 + 1
            )[1])
            // .attr('r', vm.dot_radius(data_right.length) - 2)
            .attr('r', dot_radius - 2)
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id', 'comet_tail')
            .attr('class', 'lc')
            .style('opacity', d => velocity_list[d] > max_velocity / 5 * 3 ? path_opacity - 0.4 : 0)
        comet_tail4 = vm.svg_right.selectAll("comet_tail")
            .data(index_list)
            .enter()
            .append('circle')
            .attr('cx', d => inlens_hits[d][0] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 4 + 1
            )[0])
            .attr('cy', d => inlens_hits[d][1] + normalize(
                last_5_hits[d][5][0], last_5_hits[d][5][1], last_5_hits[d][4][0], last_5_hits[d][4][1], radius * 4 + 1
            )[1])
            // .attr('r', vm.dot_radius(data_right.length) - 2)
            .attr('r', dot_radius - 2)
            .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
            .attr('id', 'comet_tail')
            .attr('class', 'lc')
            .style('opacity', d => velocity_list[d] > max_velocity / 5 * 4 ? path_opacity - 0.4 : 0)

        const isLastPath = document.getElementById("toggle-lastpath").checked;
        const isColorMap = document.getElementById("toggle-colormap").checked;
        if(isLastPath) {
            bundled_paths_right = [];
            const bundles = [];

            index_list.forEach((d, index) => {
                const x4 = last_5_hits[d][4][0];
                const y4 = last_5_hits[d][4][1];
                const x2 = last_5_hits[d][2][0];
                const y2 = last_5_hits[d][2][1];
                const group = inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top');
                if(!isStart(x2, y2) && !isStart(x4, y4)) {
                    if(dis_2d(x2, y2, bot_lens_right[0], bot_lens_right[1]) <= lens_radius) {
                        var lineData = {
                            index: index,
                            g: group,
                            path: [
                                [x2, y2],
                                [x4, y4],
                            ]
                        };
                        bundled_paths_right.push(lineData);
                    } else {
                        const circlepoint = findCirclepoint(x2, y2, x4, y4, bot_lens_right[0], bot_lens_right[1]);
                        if(bundles.length === 0) {
                            bundles.push({
                                lines: [
                                    [
                                        [x4, y4],
                                        [x2, y2],
                                        group,
                                        index,
                                    ]
                                ],
                                center4: [x4, y4],
                                center2: [x2, y2],
                                circlepoint,
                            })
                        } else {
                            let found = false;
                            for(let i = 0; i < bundles.length; i++) {
                                const vector = normalize(bundles[i].circlepoint[0], bundles[i].circlepoint[1], bot_lens_right[0], bot_lens_right[1], 1);
                                const new_vector = normalize(circlepoint[0], circlepoint[1], bot_lens_right[0], bot_lens_right[1], 1);
                                if(cosinesim(vector, new_vector) > similarity) {
                                    bundles[i].center4 = [
                                        (bundles[i].center4[0] * bundles[i].lines.length + x4) / (bundles[i].lines.length + 1),
                                        (bundles[i].center4[1] * bundles[i].lines.length + y4) / (bundles[i].lines.length + 1)
                                    ];
                                    bundles[i].center2  = [
                                        (bundles[i].center2[0] * bundles[i].lines.length + x2) / (bundles[i].lines.length + 1),
                                        (bundles[i].center2[1] * bundles[i].lines.length + y2) / (bundles[i].lines.length + 1)
                                    ]
                                    bundles[i].circlepoint = findCirclepoint(bundles[i].center2[0], bundles[i].center2[1], bundles[i].center4[0], bundles[i].center4[1],
                                        bot_lens_right[0], bot_lens_right[1]);
                                    bundles[i].lines.push([
                                        [x4, y4],
                                        [x2, y2],
                                        group,
                                        index,
                                    ])
                                    found = true;
                                    break;
                                }
                            }
                            if(!found) {
                                bundles.push({
                                    lines: [
                                        [
                                            [x4, y4],
                                            [x2, y2],
                                            group,
                                            index,
                                        ]
                                    ],
                                    center4: [x4, y4],
                                    center2: [x2, y2],
                                    circlepoint,
                                })
                            }
                        }
                    }
                }
            })

            bundles.forEach(bundle => {
                bundle.lines.forEach(line => {
                    if(bundle.circlepoint[0] !== 0 && bundle.circlepoint[1] !== 0) {
                        var lineData = {
                            index: line[3],
                            g: line[2],
                            path: [
                                [line[0][0], line[0][1]],
                                [bundle.circlepoint[0], bundle.circlepoint[1]],
                                [line[1][0], line[1][1]],
                            ]
                        };
                    } else {
                        var lineData = {
                            index: line[3],
                            g: line[2],
                            path: [
                                [line[0][0], line[0][1]],
                                [line[1][0], line[1][1]],
                            ]
                        };
                    }  
                    bundled_paths_right.push(lineData);
                })
            })
            obj.draw_path_lines_right();

            path_circles = vm.svg_right.selectAll("path_circles")
                .data(index_list)
                .enter()
                .append('circle')
                .attr('cx', d => lastIsStart(d, 4) ? 0 : last_5_hits[d][4][0])
                .attr('cy', d => lastIsStart(d, 4) ? 0 : last_5_hits[d][4][1])
                // .attr('r', vm.dot_radius(data_right.length))
                .attr('r', dot_radius)
                // .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
                .attr('fill', 'silver')
                .attr('id', 'path_circles')
                .attr('class', d => 'lc' + d)
                .style('opacity', path_opacity - 0.2)
            path_circles2 = vm.svg_right.selectAll("path_circles")
                .data(index_list)
                .enter()
                .append('circle')
                .attr('cx', d => lastIsStart(d, 2) || lastIsStart(d, 4) ? 0 : last_5_hits[d][2][0])
                .attr('cy', d => lastIsStart(d, 2) || lastIsStart(d, 4) ? 0 : last_5_hits[d][2][1])
                // .attr('r', vm.dot_radius(data_right.length))
                .attr('r', dot_radius)
                .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
                .attr('id', 'path_circles')
                .attr('class', d => 'lc' + d)
                .style('opacity', path_opacity)
        } else {
            if(!isColorMap) {
                path_circles = vm.svg_right.selectAll("path_circles")
                    .data(index_list)
                    .enter()
                    .append('circle')
                    .attr('cx', d => lastIsStart(d, 4) ? 0 : last_5_hits[d][4][0])
                    .attr('cy', d => lastIsStart(d, 4) ? 0 : last_5_hits[d][4][1])
                    // .attr('r', vm.dot_radius(data_right.length))
                    .attr('r', dot_radius)
                    .attr('fill', d => groupColors(inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top')))
                    .attr('id', 'path_circles')
                    .attr('class', d => 'lc' + d)
                    .style('opacity', path_opacity)
            }
        }
        if(isColorMap) {
            colormap.forEach((c, d) => {
                if(freqchar(c)) {
                    let e = entropy(c);
                    // e = (3 - e) / 3;
                    e = (3 - e) * sigmoid(right_colormap[d].length, 2) * 0.75;
                    vm.svg_right.append("rect")
                        .attr("x", reversed_windows[d][0] - region_width / 2)
                        .attr("y", reversed_windows[d][1] - region_height / 2)
                        .attr("width", region_width)
                        .attr("height", region_height)
                        .attr("id", 'color_window')
                        .attr("class", 'w' + d)
                        .attr("fill", groupColors(freqchar(c)))
                        .attr("fill-opacity", 0.25 * e)
                }
            });
        }

        // var side_paths = [];
        // index_list.forEach((d, index) => {
        //     if(last_5_hits[d][4][1]) {
        //         var lineData = {
        //             index: index,
        //             g: inGroup(inlens_hits[d][0], inlens_hits[d][1], 'top'),
        //             path: [
        //                 [inlens_hits[d][1], findSideHeight(12)],
        //                 [court_height * 5, findSideHeight(30)],
        //                 [last_5_hits[d][4][1], findSideHeight(17)],
        //             ]
        //         };
        //         side_paths.push(lineData);
        //     }
        // })
        // var bundleLine = d3.line().curve(d3.curveBundle.beta(1));
        // vm.svg_right_side.selectAll("side_lines")
        //     .data(side_paths)
        //     .enter()
        //     .append('path')
        //     .attr('id', 'side_lines')
        //     .attr('class', d => 'ls' + d.index)
        //     .attr("d", d => bundleLine(d.path))
        //     .style('stroke', d => groupColors(d.g))
        //     .style('stroke-width', '2')
        //     .style('fill', 'none')
        //     .style('opacity', path_opacity - 0.3)
        
        d3.selectAll("#loss_table_body").remove();
        if(is_table_update == true) {
            obj.update_right_info_table(index_list, info_list, last_5_hits, file_list, round_list);
        }
    },
    reload_court_left : function(is_table_update) {
        if (arrow_left1 == '') {
            obj.draw_arrow();
        } else {
            obj.update_arrow();
        }
        data_left = [];
        dataLoader(player_selected, opponent_selected, data_left, opponent_list);

        obj.draw_map_left(is_table_update);
        obj.find_distrib_left(is_table_update);
        obj.find_entropy_left(is_table_update);
    },
    reload_court_right : function(is_table_update){
        data_right = [];
        dataLoader(player_selected_right, opponent_selected_right, data_right, opponent_list_right);

        obj.draw_map_right(is_table_update);
        obj.find_distrib_right(is_table_update);
        obj.find_entropy_right(is_table_update);
    },
    find_inside_hits : function() {
        let t = document.getElementById("left-set-select");
        var setSelect = t.options[t.selectedIndex].value;
        let halfChecked = document.getElementById("left-half-check").checked;
        let inlens_hits = [];
        let info_list = [];
        let file_list = [];
        let last_5_hits = [];
        let velocity_list = []
        let index_list = [];
        let total_index = 0;
        let round_list = [];
        let colormap = new Array(windows.length).fill('');
        for (var i in data_left) {
            info = data_left[i];
            set = info[0]; scoreA = info[1]; scoreB = info[2];
            player_x = info[3]; player_y = info[4];
            opponent_x = info[5]; opponent_y = info[6];
            hit_x = info[7]; hit_y = info[8];
            last4_x = info[9]; last4_y = info[10];
            last3_x = info[11]; last3_y = info[12];
            last2_x = info[13]; last2_y = info[14];
            ball_round = info[15]; velocity = info[16];
            pair_name = info[17]; match_name = info[18];
            var new_coord = obj.get_reverse_coord(opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);       
            var new_coord_6 = obj.get_reverse_coord_6(last4_x,last4_y,last3_x,last3_y,last2_x,last2_y,opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);
            if (landing == 'top') {
                if(dis_2d(new_coord[0][0],new_coord[0][1],top_lens_left[0],top_lens_left[1]) < lens_radius) {
                    if(dis_2d(new_coord[1][0],new_coord[1][1],bot_lens_left[0],bot_lens_left[1]) < lens_radius) {
                        if(set == setSelect || setSelect == 0) {
                            if((halfChecked && (scoreA >= 15 || scoreB >= 15)) || !halfChecked) {
                                info_list.push([match_name.replace(/_/g, ' '), set, scoreA, scoreB]);
                                file_list.push(`${pair_name}_${match_name}.mp4/rally_video/${set}_${String(scoreA).padStart(2, '0')}_${String(scoreB).padStart(2, '0')}.mp4`);
                                last_5_hits.push(new_coord_6);
                                velocity_list.push(velocity);
                                inlens_hits.push(new_coord[2]);
                                index_list.push(total_index);
                                round_list.push(ball_round);
                                total_index++;
                                if(!isStart(new_coord_6[2][0], new_coord_6[2][1])) {
                                    const inWindows = inWindow(new_coord_6[2][0], new_coord_6[2][1], 'bot');
                                    const group = inGroup(new_coord[2][0], new_coord[2][1], landing);
                                    inWindows.forEach(window => {
                                        colormap[window] = colormap[window].concat(group);
                                    }); 
                                }
                            }     
                        }    
                    }
                }
            }
        }
        left_colormap = colormap;
        return [inlens_hits,info_list,file_list,last_5_hits,velocity_list,index_list,total_index,round_list, colormap];
    },
    find_inside_hits_right : function(){
        let t = document.getElementById("right-set-select");
        var setSelectRight = t.options[t.selectedIndex].value;
        let halfCheckedRight = document.getElementById("right-half-check").checked;
        let inlens_hits = [];
        let info_list = [];
        let file_list = [];
        let last_5_hits = [];
        let velocity_list = []
        let index_list = [];
        let total_index = 0;
        let round_list = [];
        let colormap = new Array(windows.length).fill('');
        for (var i in data_right){
            info = data_right[i];
            set = info[0]; scoreA = info[1]; scoreB = info[2];
            player_x = info[3]; player_y = info[4];
            opponent_x = info[5]; opponent_y = info[6];
            hit_x = info[7]; hit_y = info[8];
            last4_x = info[9]; last4_y = info[10];
            last3_x = info[11]; last3_y = info[12];
            last2_x = info[13]; last2_y = info[14];
            ball_round = info[15]; velocity = info[16];
            pair_name = info[17]; match_name = info[18];
            var new_coord = obj.get_reverse_coord(opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);
            var new_coord_6 = obj.get_reverse_coord_6(last4_x,last4_y,last3_x,last3_y,last2_x,last2_y,opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);
            if (landing == 'top'){
                if(dis_2d(new_coord[0][0],new_coord[0][1],top_lens_right[0],top_lens_right[1]) < lens_radius) {
                    if(dis_2d(new_coord[1][0],new_coord[1][1],bot_lens_right[0],bot_lens_right[1]) < lens_radius) {
                        if(set == setSelectRight || setSelectRight == 0) {
                            if((halfCheckedRight && (scoreA >= 15 || scoreB >= 15)) || !halfCheckedRight) {
                                info_list.push([match_name.replace(/_/g, ' '), set, scoreA, scoreB]);
                                file_list.push(`${pair_name}_${match_name}.mp4/rally_video/${set}_${scoreA}_${scoreB}.mp4`);
                                last_5_hits.push(new_coord_6);
                                velocity_list.push(velocity);
                                inlens_hits.push(new_coord[2]);
                                index_list.push(total_index);
                                round_list.push(ball_round);
                                total_index++;
                                if(!isStart(new_coord_6[2][0], new_coord_6[2][1])) {
                                    const inWindows = inWindow(new_coord_6[2][0], new_coord_6[2][1], 'bot');
                                    const group = inGroup(new_coord[2][0], new_coord[2][1], landing);
                                    inWindows.forEach(window => {
                                        colormap[window] = colormap[window].concat(group);
                                    }); 
                                }
                            }     
                        }    
                    }
                }
            }
        }
        right_colormap = colormap;
        return [inlens_hits,info_list,file_list,last_5_hits,velocity_list,index_list,total_index,round_list, colormap];
    },
    find_distrib_left: function() {
        let t = document.getElementById("left-set-select");
        var setSelect = t.options[t.selectedIndex].value;
        let halfChecked = document.getElementById("left-half-check").checked;
        variety_list = [];
        for(let i = 0; i < regions.length; i++) {
            for(let j = 0; j < regions.length; j++) {
                left_count[i][j] = 0;
                for(let k = 0; k < regions.length; k++) {
                    left_hitmap[i][j][k] = 0;
                    left_distrib[i][j][k] = '';
                }
            }
        }

        for (var i in data_left) {
            info = data_left[i];
            set = info[0]; scoreA = info[1]; scoreB = info[2];
            player_x = info[3]; player_y = info[4];
            opponent_x = info[5]; opponent_y = info[6];
            hit_x = info[7]; hit_y = info[8];
            var new_coord = obj.get_reverse_coord(opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);
            if (landing == 'top') {
                for(let j = 0; j < regions.length; j++) {
                    if(dis_2d(new_coord[0][0], new_coord[0][1], regions[j][0], regions[j][1]) < lens_radius) {
                        for(let k = 0; k < regions.length; k++) {
                            if(dis_2d(new_coord[1][0], new_coord[1][1], reversed_regions[k][0], reversed_regions[k][1]) < lens_radius) {
                                if(set == setSelect || setSelect == 0) {
                                    if((halfChecked && (scoreA >= 15 || scoreB >= 15)) || !halfChecked) {
                                        const reg = inRegion(new_coord[2][0], new_coord[2][1], landing);
                                        left_hitmap[j][k][reg]++;
                                        left_count[j][k]++;
                                    }
                                }
                            }
                        }
                    }
                }
            } else if(landing == 'bot') {
                for(let j = 0; j < regions.length; j++) {
                    if(dis_2d(new_coord[0][0], new_coord[0][1], reversed_regions[j][0], reversed_regions[j][1]) < lens_radius) {
                        for(let k = 0; k < regions.length; k++) {
                            if(dis_2d(new_coord[1][0], new_coord[1][1], regions[k][0], regions[k][1]) < lens_radius) {
                                if(set == setSelect || setSelect == 0) {
                                    if((halfChecked && (scoreA >= 15 || scoreB >= 15)) || !halfChecked) {
                                        const reg = inRegion(new_coord[2][0], new_coord[2][1], landing);
                                        left_hitmap[k][j][reg]++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        for(let i = 0; i < regions.length; i++) {
            for(let j = 0; j < regions.length; j++) {
                for(let k = 0; k < regions.length; k++) {
                    if(left_count[i][j]) {
                        left_distrib[i][j][k] = left_hitmap[i][j][k] / left_count[i][j];
                    }
                }
            }
        }
        obj.find_variety();
    },
    find_distrib_right: function() {
        let t = document.getElementById("right-set-select");
        var setSelectRight = t.options[t.selectedIndex].value;
        let halfCheckedRight = document.getElementById("right-half-check").checked;
        variety_list = [];
        for(let i = 0; i < regions.length; i++) {
            for(let j = 0; j < regions.length; j++) {
                right_count[i][j] = 0;
                for(let k = 0; k < regions.length; k++) {
                    right_hitmap[i][j][k] = 0;
                    right_distrib[i][j][k] = '';
                }
            }
        }

        for (var i in data_right) {
            info = data_right[i];
            set = info[0]; scoreA = info[1]; scoreB = info[2];
            player_x = info[3]; player_y = info[4];
            opponent_x = info[5]; opponent_y = info[6];
            hit_x = info[7]; hit_y = info[8];
            var new_coord = obj.get_reverse_coord(opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);
            if (landing == 'top') {
                for(let j = 0; j < regions.length; j++) {
                    if(dis_2d(new_coord[0][0], new_coord[0][1], regions[j][0], regions[j][1]) < lens_radius) {
                        for(let k = 0; k < regions.length; k++) {
                            if(dis_2d(new_coord[1][0], new_coord[1][1], reversed_regions[k][0], reversed_regions[k][1]) < lens_radius) {
                                if(set == setSelectRight || setSelectRight == 0) {
                                    if((halfCheckedRight && (scoreA >= 15 || scoreB >= 15)) || !halfCheckedRight) {
                                        const reg = inRegion(new_coord[2][0], new_coord[2][1], landing);
                                        right_hitmap[j][k][reg]++;
                                        right_count[j][k]++;
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (landing == 'bot') {
                for(let j = 0; j < regions.length; j++) {
                    if(dis_2d(new_coord[0][0], new_coord[0][1], reversed_regions[j][0], reversed_regions[j][1]) < lens_radius) {
                        for(let k = 0; k < regions.length; k++) {
                            if(dis_2d(new_coord[1][0], new_coord[1][1], regions[k][0], regions[k][1]) < lens_radius) {
                                if(set == setSelectRight || setSelectRight == 0) {
                                    if((halfCheckedRight && (scoreA >= 15 || scoreB >= 15)) || !halfCheckedRight) {
                                        const reg = inRegion(new_coord[2][0], new_coord[2][1], landing);
                                        right_hitmap[k][j][reg]++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        for(let i = 0; i < regions.length; i++) {
            for(let j = 0; j < regions.length; j++) {
                for(let k = 0; k < regions.length; k++) {
                    if(right_count[i][j]) {
                        right_distrib[i][j][k] = right_hitmap[i][j][k] / right_count[i][j];
                    }
                }
            }
        }
        obj.find_variety();
    },
    find_variety: function() {
        for(let i = 0; i < regions.length; i++) {
            for(let j = 0; j < regions.length; j++) {
                let distance = 0;
                const s = sigmoid(left_count[i][j] + right_count[i][j], 24);
                for(let k = 0; k < regions.length; k++) {
                    distance += s * Math.abs(left_distrib[i][j][k] - right_distrib[i][j][k]);
                }
                variety_list.push([distance.toFixed(3), i, j]);
            }
        }
        if(variety_list[0][0] !== 'NaN') {
            obj.update_variety_table();
        }
    },
    update_variety_table: function() {
        d3.select("#variety_table_body").remove();
        var tablebody = d3.select("#variety_table").append("tbody")
            .attr('id', 'variety_table_body')
        rows = tablebody.selectAll("tr")
            .data(Array.from(Array(81).keys()))
            .enter()
            .append("tr")
            .attr('class', function(d){ return 't' + d; })
            .on('mouseenter', function(d){
                d3.select("#variety_table").selectAll('.t' + d)
                    .style('background-color', "yellow")
            })
            .on('mouseleave',function(d){
                d3.select("#variety_table").selectAll('.t' + d)
                    .style('background', "none")
            })
            .on('click', function(d) {
                d3.selectAll("#last_path").remove();
                d3.selectAll("#last_path_text").remove();
                d3.selectAll("#hit_table_body").remove();
                d3.selectAll("#loss_table_body").remove();
                d3.selectAll("#mouseover_text").remove();

                hit_circles = '';
                hit_circles_right = '';

                top_lens_left[0] = regions[variety_list[d][1]][0];
                top_lens_left[1] = regions[variety_list[d][1]][1];
                bot_lens_left[0] = reversed_regions[variety_list[d][2]][0];
                bot_lens_left[1] = reversed_regions[variety_list[d][2]][1];
                top_lens_right[0]= regions[variety_list[d][1]][0];
                top_lens_right[1] = regions[variety_list[d][1]][1];
                bot_lens_right[0] = reversed_regions[variety_list[d][2]][0];
                bot_lens_right[1] = reversed_regions[variety_list[d][2]][1];

                vm.svg_left.selectAll(".lens").remove();
                // circles = d3.range(2).map(function(i) {
                //     return {
                //         x: circle_x_left[i],
                //         y: circle_y_left[i],
                //         id: id_list[i],
                //     };
                // });
                vm.svg_left.append("circle")
                    .attr("cx", top_lens_left[0])
                    .attr("cy", top_lens_left[1])
                    .attr("r", lens_radius)
                    .attr("id", 'opponent')
                    .attr("class", 'lens')
                    .attr("stroke", 'grey')
                    .style('stroke-width', '2')
                    .attr("fill-opacity", 0)
                    .call(d3.drag()
                        .on("start", obj.ondragstart)
                        .on("drag", obj.ondrag)
                        .on("end", obj.ondragend)
                    );
                vm.svg_left.append("circle")
                    .attr("cx", bot_lens_left[0])
                    .attr("cy", bot_lens_left[1])
                    .attr("r", lens_radius)
                    .attr("id", 'me')
                    .attr("class", 'lens')
                    .attr("stroke", 'grey')
                    .style('stroke-width', '2')
                    .attr("fill-opacity", 0)
                    .call(d3.drag()
                        .on("start", obj.ondragstart)
                        .on("drag", obj.ondrag)
                        .on("end", obj.ondragend)
                    );
                vm.svg_right.select("#opponent")
                    .attr("cx", top_lens_right[0])
                    .attr("cy", top_lens_right[1])
                vm.svg_right.select("#me")
                    .attr("cx", bot_lens_right[0])
                    .attr("cy", bot_lens_right[1])
                // vm.svg_left_side.select("#opponent")
                //     .attr("cx", top_lens_left[1])
                // vm.svg_left_side.select("#me")
                //     .attr("cx", bot_lens_left[1])
                // vm.svg_right_side.select("#opponent")
                //     .attr("cx", top_lens_left[1])
                // vm.svg_right_side.select("#me")
                //     .attr("cx", bot_lens_left[1])

                obj.update_arrow();
                obj.draw_map_left(true);
                obj.draw_map_right(true);
            }
        )
        .append("td")
        .text(d => variety_list[d][0]);
        sortTableDesc(document.getElementById("variety_table"));
    },
    find_entropy_left: function() {
        let t = document.getElementById("left-set-select");
        var setSelect = t.options[t.selectedIndex].value;
        let halfChecked = document.getElementById("left-half-check").checked;
        left_entropy_list = [];
        for(let i = 0; i < regions.length; i++) {
            for(let j = 0; j < regions.length; j++) {
                left_last_count[i][j] = 0;
                left_entropy[i][j] = 0;
                for(let k = 0; k < windows.length; k++) {
                    left_last_hitmap[i][j][k] = '';
                }
            }
        }
        
        for (var i in data_left) {
            info = data_left[i];
            set = info[0]; scoreA = info[1]; scoreB = info[2];
            player_x = info[3]; player_y = info[4];
            opponent_x = info[5]; opponent_y = info[6];
            hit_x = info[7]; hit_y = info[8];
            last4_x = info[9]; last4_y = info[10];
            last3_x = info[11]; last3_y = info[12];
            last2_x = info[13]; last2_y = info[14];
            var new_coord = obj.get_reverse_coord(opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);
            var new_coord_6 = obj.get_reverse_coord_6(last4_x,last4_y,last3_x,last3_y,last2_x,last2_y,opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);
            if (landing == 'top') {
                for(let j = 0; j < regions.length; j++) {
                    if(dis_2d(new_coord[0][0], new_coord[0][1], regions[j][0], regions[j][1]) < lens_radius) {
                        for(let k = 0; k < regions.length; k++) {
                            if(dis_2d(new_coord[1][0], new_coord[1][1], reversed_regions[k][0], reversed_regions[k][1]) < lens_radius) {
                                if(set == setSelect || setSelect == 0) {
                                    if((halfChecked && (scoreA >= 15 || scoreB >= 15)) || !halfChecked) {
                                        if(!isStart(new_coord_6[2][0], new_coord_6[2][1])) {
                                            const inWindows = inWindow(new_coord_6[2][0], new_coord_6[2][1], 'bot');
                                            const group = inGroup(new_coord[2][0], new_coord[2][1], landing);
                                            inWindows.forEach(window => {
                                                left_last_hitmap[j][k][window] = left_last_hitmap[j][k][window].concat(group);
                                            })   
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        for(let i = 0; i < regions.length; i++) {
            for(let j = 0; j < regions.length; j++) {
                for(let k = 0; k < windows.length; k++) {
                    if(left_last_hitmap[i][j][k].length) {
                        let e = entropy(left_last_hitmap[i][j][k]);
                        e = (3 - e) * sigmoid(left_last_hitmap[i][j][k].length, 2);
                        left_entropy_list.push([e.toFixed(4), i, j, k]);
                    }
                }
            }
        }
        obj.update_left_entropy_table();
    },
    find_entropy_right: function() {
        let t = document.getElementById("right-set-select");
        var setSelect = t.options[t.selectedIndex].value;
        let halfChecked = document.getElementById("right-half-check").checked;
        right_entropy_list = [];
        for(let i = 0; i < regions.length; i++) {
            for(let j = 0; j < regions.length; j++) {
                right_last_count[i][j] = 0;
                right_entropy[i][j] = 0;
                for(let k = 0; k < window.length; k++) {
                    right_last_hitmap[i][j][k] = '';
                }
            }
        }
        
        for (var i in data_right) {
            info = data_right[i];
            set = info[0]; scoreA = info[1]; scoreB = info[2];
            player_x = info[3]; player_y = info[4];
            opponent_x = info[5]; opponent_y = info[6];
            hit_x = info[7]; hit_y = info[8];
            last4_x = info[9]; last4_y = info[10];
            last3_x = info[11]; last3_y = info[12];
            last2_x = info[13]; last2_y = info[14];
            var new_coord = obj.get_reverse_coord(opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);
            var new_coord_6 = obj.get_reverse_coord_6(last4_x,last4_y,last3_x,last3_y,last2_x,last2_y,opponent_x,opponent_y,player_x,player_y,hit_x,hit_y,landing);
            if (landing == 'top') {
                for(let j = 0; j < regions.length; j++) {
                    if(dis_2d(new_coord[0][0], new_coord[0][1], regions[j][0], regions[j][1]) < lens_radius) {
                        for(let k = 0; k < regions.length; k++) {
                            if(dis_2d(new_coord[1][0], new_coord[1][1], reversed_regions[k][0], reversed_regions[k][1]) < lens_radius) {
                                if(set == setSelect || setSelect == 0) {
                                    if((halfChecked && (scoreA >= 15 || scoreB >= 15)) || !halfChecked) {
                                        if(!isStart(new_coord_6[2][0], new_coord_6[2][1])) {
                                            const inWindows = inWindow(new_coord_6[2][0], new_coord_6[2][1], 'bot');
                                            const group = inGroup(new_coord[2][0], new_coord[2][1], landing);
                                            inWindows.forEach(window => {
                                                right_last_hitmap[j][k][window] = right_last_hitmap[j][k][window].concat(group);
                                                // right_last_count[j][k]++;
                                            })
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // else if(landing == 'bot') {
            //     for(let j = 0; j < regions; j++) {
            //         if(dis_2d(new_coord[0][0], new_coord[0][1], reversed_locations[j][0], reversed_locations[j][1]) < lens_radius) {
            //             for(let k = 0; k < regions; k++) {
            //                 if(dis_2d(new_coord[1][0], new_coord[1][1], locations[k][0], locations[k][1]) < lens_radius) {
            //                     if(set == setSelect || setSelect == 3) {
            //                         if((halfChecked && (scoreA >= 15 || scoreB >= 15)) || !halfChecked) {
            //                         }
            //                     }
            //                 }
            //             }
            //         }
            //     }
            // }
        }
        for(let i = 0; i < regions.length; i++) {
            for(let j = 0; j < regions.length; j++) {
                for(let k = 0; k < windows.length; k++) {
                        if(right_last_hitmap[i][j][k].length) {    
                        let e = entropy(right_last_hitmap[i][j][k]);
                        e = (3 - e) * sigmoid(right_last_hitmap[i][j][k].length, 2);
                        right_entropy_list.push([e.toFixed(4), i, j, k]);
                    }
                }
            }
        }
        obj.update_right_entropy_table();
    },
    update_left_entropy_table: function() {
        const ranking = 50;
        left_entropy_list.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
        left_entropy_list = left_entropy_list.splice(0, ranking)
        
        d3.select("#left-entropy-table-body").remove();
        var tablebody = d3.select("#left-entropy-table").append("tbody")
            .attr('id', 'left-entropy-table-body')
        rows = tablebody.selectAll("tr")
            .data(Array.from(Array(ranking).keys()))
            .enter()
            .append("tr")
            .attr('class', function(d){ return 't' + d; })
            .on('mouseenter', function(d){
                d3.select("#left-entropy-table").selectAll('.t' + d)
                    .style('background-color', "yellow")
            })
            .on('mouseleave',function(d){
                d3.select("#left-entropy-table").selectAll('.t' + d)
                    .style('background', "none")
            })
            .on('click', function(d) {
                d3.selectAll("#last_path").remove();
                d3.selectAll("#last_path_text").remove();
                d3.selectAll("#hit_table_body").remove();
                d3.selectAll("#loss_table_body").remove();
                d3.selectAll("#mouseover_text").remove();

                hit_circles = '';
                hit_circles_right = '';
                top_lens_left[0]= regions[left_entropy_list[d][1]][0];
                top_lens_left[1] = regions[left_entropy_list[d][1]][1];
                bot_lens_left[0] = reversed_regions[left_entropy_list[d][2]][0];
                bot_lens_left[1] = reversed_regions[left_entropy_list[d][2]][1];

                vm.svg_left.selectAll(".lens").remove();
                vm.svg_left.append("circle")
                    .attr("cx", top_lens_left[0])
                    .attr("cy", top_lens_left[1])
                    .attr("r", lens_radius)
                    .attr("id", 'opponent')
                    .attr("class", 'lens')
                    .attr("stroke", 'grey')
                    .style('stroke-width', '2')
                    .attr("fill-opacity", 0)
                    .call(d3.drag()
                        .on("start", obj.ondragstart)
                        .on("drag", obj.ondrag)
                        .on("end", obj.ondragend)
                    );
                vm.svg_left.append("circle")
                    .attr("cx", bot_lens_left[0])
                    .attr("cy", bot_lens_left[1])
                    .attr("r", lens_radius)
                    .attr("id", 'me')
                    .attr("class", 'lens')
                    .attr("stroke", 'grey')
                    .style('stroke-width', '2')
                    .attr("fill-opacity", 0)
                    .call(d3.drag()
                        .on("start", obj.ondragstart)
                        .on("drag", obj.ondrag)
                        .on("end", obj.ondragend)
                    );

                // vm.svg_right.select("#opponent")
                //     .attr("cx", top_lens_left[0])
                //     .attr("cy", top_lens_left[1])
                // vm.svg_right.select("#me")
                //     .attr("cx", bot_lens_left[0])
                //     .attr("cy", bot_lens_left[1])
                // vm.svg_left_side.select("#opponent")
                //     .attr("cx", top_lens_left[1])
                // vm.svg_left_side.select("#me")
                //     .attr("cx", bot_lens_left[1])
                // vm.svg_right_side.select("#opponent")
                //     .attr("cx", top_lens_left[1])
                // vm.svg_right_side.select("#me")
                //     .attr("cx", bot_lens_left[1])
                obj.update_arrow();
                obj.draw_map_left(true);
                // obj.draw_histogram(left_entropy_list[d][1], left_entropy_list[d][2], left_entropy_list[d][3])
                // obj.draw_map_right(true);
            }
        )
        .append("td")
        .text(d => left_entropy_list[d][0]);
        sortTableDesc(document.getElementById("left-entropy-table"));
    },
    update_right_entropy_table: function() {
        const ranking = 50;
        right_entropy_list.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
        right_entropy_list = right_entropy_list.splice(0, ranking)

        d3.select("#right-entropy-table-body").remove();
        var tablebody = d3.select("#right-entropy-table").append("tbody")
            .attr('id', 'right-entropy-table-body')
        rows = tablebody.selectAll("tr")
            .data(Array.from(Array(ranking).keys()))
            .enter()
            .append("tr")
            .attr('class', function(d){ return 't' + d; })
            .on('mouseenter', function(d){
                d3.select("#right-entropy-table").selectAll('.t' + d)
                    .style('background-color', "yellow")
            })
            .on('mouseleave',function(d){
                d3.select("#right-entropy-table").selectAll('.t' + d)
                    .style('background', "none")
            })
            .on('click', function(d) {
                d3.selectAll("#last_path").remove();
                d3.selectAll("#last_path_text").remove();
                d3.selectAll("#hit_table_body").remove();
                d3.selectAll("#loss_table_body").remove();
                d3.selectAll("#mouseover_text").remove();

                hit_circles = '';
                hit_circles_right = '';

                top_lens_right[0]= regions[right_entropy_list[d][1]][0];
                top_lens_right[1] = regions[right_entropy_list[d][1]][1];
                bot_lens_right[0] = reversed_regions[right_entropy_list[d][2]][0];
                bot_lens_right[1] = reversed_regions[right_entropy_list[d][2]][1];

                vm.svg_right.select("#opponent")
                    .attr("cx", top_lens_right[0])
                    .attr("cy", top_lens_right[1])
                vm.svg_right.select("#me")
                    .attr("cx", bot_lens_right[0])
                    .attr("cy", bot_lens_right[1])
                // vm.svg_left_side.select("#opponent")
                //     .attr("cx", top_lens_left[1])
                // vm.svg_left_side.select("#me")
                //     .attr("cx", bot_lens_left[1])
                // vm.svg_right_side.select("#opponent")
                //     .attr("cx", top_lens_left[1])
                // vm.svg_right_side.select("#me")
                //     .attr("cx", bot_lens_left[1])
                obj.update_arrow();
                // obj.draw_map_left(true);
                obj.draw_map_right(true);
                obj.draw_histogram_right(right_entropy_list[d][1], right_entropy_list[d][2], right_entropy_list[d][3])
            }
        )
        .append("td")
        .text(d => right_entropy_list[d][0]);
        sortTableDesc(document.getElementById("right-entropy-table"));
    },
    update_left_info_table: function(index_list, info_list, last_5_hits, file_list, round_list) {
        var tablebody = d3.select("#hit_table").append("tbody")
        .attr('id', 'hit_table_body')
        rows = tablebody.selectAll("tr")
            .data(index_list)
            .enter()
            .append("tr")
            .attr('class', d => 't' + d)
            .attr('id', 'hit_row')
            .on('mouseenter', function(d) {
                d3.select(this).style('background', "yellow")
                d3.selectAll('.c' + d)
                    // .attr('r', vm.dot_radius(data_left.length) + 3)
                    .attr('r', dot_radius + 3)
                    .style('opacity', 1.0)
                d3.selectAll('.p' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                d3.selectAll('.s' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                vm.svg_left.selectAll('#mouseover_text').remove();
                vm.svg_left.append('text')
                    .attr('x',5)
                    .attr('y',20)
                    .style('font-size', '20px')
                    .style('font-weight', 'bold')
                    .attr('id','mouseover_text')
                    .text(info_list[d])
                })
            .on('mouseleave', function(d) {
                d3.select(this).style('background', "none")
                d3.selectAll('.c' + d)
                    // .attr('r', vm.dot_radius(data_left.length))
                    .attr('r', dot_radius)
                    .style('opacity', path_opacity)
                d3.selectAll('.p' + d)
                    .style('stroke-width', 2)
                    .style('opacity', path_opacity - 0.3)
                d3.selectAll('.s' + d)
                    .style('stroke-width', 2)
                    .style('opacity', path_opacity - 0.3)
                d3.selectAll('#mouseover_text').remove();
            })
            .on('click', function(d) {
                d3.selectAll("#hit_row").style('background', 'none')
                d3.selectAll("#hit_row").on("mouseleave", function(d) {
                    d3.select(this).style('background', "none")
                    d3.selectAll('.c' + d)
                        // .attr('r', vm.dot_radius(data_left.length))
                        .attr('r', dot_radius)
                        .style('opacity', path_opacity)
                    d3.selectAll('.p' + d)
                        .style('stroke-width', 2)
                        .style('opacity', path_opacity - 0.3)
                    d3.selectAll('.s' + d)
                        .style('stroke-width', 2)
                        .style('opacity', path_opacity - 0.3)
                    d3.selectAll('#mouseover_text').remove();
                });
                d3.selectAll("#hit_row").style('background', 'none')
                d3.select(this).style('background', 'yellow')
                d3.select(this).on("mouseleave", null);

                vm.svg_left.selectAll('#hit_circles')
                    // .attr('r', vm.dot_radius(data_left.length))
                    .attr('r', dot_radius)
                    .style('opacity', 0.3)
                vm.svg_left.selectAll('#path_circles')
                    // .attr('r', vm.dot_radius(data_left.length))
                    .attr('r', dot_radius)
                    .style('opacity', 0.3)
                vm.svg_left.selectAll('#path_lines')
                    .style('stroke-width', 3)
                    .style('opacity', 0.3)
                vm.svg_left_side.selectAll('#side_lines')
                    .style('stroke-width', 3)
                    .style('opacity', 0.3)
                d3.selectAll('.c' + d)
                    // .attr('r', vm.dot_radius(data_left.length) + 3)
                    .attr('r', dot_radius + 3)
                    .style('opacity', 1.0)
                d3.selectAll('.p' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                d3.selectAll('.s' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                vm.svg_left.selectAll("#last_path").remove();
                vm.svg_left.selectAll("#last_path_text").remove();
                hit_circles_text = vm.svg_left.selectAll("last_path_text")
                    .data([0,1,2,3,4,5])
                    .enter()
                    .append('text')
                    .attr('x', d2 => last_5_hits[d][d2][0])
                    .attr('y', d2 => last_5_hits[d][d2][1])
                    .style('font-size', '20px')
                    .style('font-weight', 'bold')
                    .attr('id','last_path_text')
                    .text(d2 => round_list[d] - 4 + d2)
                filepath = './video/'+ file_list[d];
                console.log(filepath);
                var video_tag = document.getElementById('video_id');
                video_tag.src = filepath;
                video_tag.play();
            })
        cells = rows.selectAll("td")
            .data(d => info_list[d])
            .enter()
            .append("td")
            .text(d => d);
        sortTable(document.getElementById("hit_table"), 0, 1);
    },
    update_right_info_table: function(index_list, info_list, last_5_hits, file_list, round_list) {
        var loss_tablebody = d3.select("#loss_table").append("tbody")
        .attr('id','loss_table_body')
        loss_rows = loss_tablebody.selectAll("tr")
            .data(index_list)
            .enter()
            .append("tr")
            .attr('class', d => 'lt' + d)
            .attr('id','loss_row')
            .on('mouseenter', function(d){
                d3.select(this).style('background', "yellow")
                d3.selectAll('.lc' + d)
                    // .attr('r', vm.dot_radius(data_right.length) + 3)
                    .attr('r', dot_radius + 3)
                    .style('opacity', 1.0)
                d3.selectAll('.lp' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                d3.selectAll('.ls' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                vm.svg_right.selectAll('#mouseover_text').remove();
                vm.svg_right.append('text')
                    .attr('x',5)
                    .attr('y',20)
                    .style('font-size', '20px')
                    .style('font-weight', 'bold')
                    .attr('id','mouseover_text')
                    .text(info_list[d])
            })
            .on('mouseleave', function(d) {
                d3.select(this).style('background', "none")
                d3.selectAll('.lc' + d)
                    // .attr('r', vm.dot_radius(data_right.length))
                    .attr('r', dot_radius)
                    .style('opacity', path_opacity)
                d3.selectAll('.lp' + d)
                    .style('stroke-width', 2)
                    .style('opacity', path_opacity - 0.3)
                d3.selectAll('.ls' + d)
                    .style('stroke-width', 2)
                    .style('opacity', path_opacity - 0.3)
                d3.selectAll('#mouseover_text').remove();
            })
            .on('click', function(d) {
                d3.selectAll("#loss_row").style('background', 'none')
                d3.selectAll("#loss_row").on("mouseleave", function(d) {
                    d3.select(this).style('background', "none")
                    d3.selectAll('.lc' + d)
                        // .attr('r', vm.dot_radius(data_right.length))
                        .attr('r', dot_radius)
                        .style('opacity', path_opacity)
                    d3.selectAll('.lp' + d)
                        .style('stroke-width', 2)
                        .style('opacity', path_opacity - 0.3)
                    d3.selectAll('.ls' + d)
                        .style('stroke-width', 2)
                        .style('opacity', path_opacity - 0.3)
                    d3.selectAll('#mouseover_text').remove();
                });
                d3.selectAll("#loss_row").style('background', 'none')
                d3.select(this).style('background', 'yellow')
                d3.select(this).on("mouseleave", null);

                vm.svg_right.selectAll('#hit_circles')
                    // .attr('r', vm.dot_radius(data_left.length))
                    .attr('r', dot_radius)
                    .style('opacity', 0.3)
                vm.svg_right.selectAll('#path_circles')
                    // .attr('r', vm.dot_radius(data_right.length) + 3)
                    .attr('r', dot_radius)
                    .style('opacity', 0.3)
                vm.svg_right.selectAll('#path_lines')
                    .style('stroke-width', 3)
                    .style('opacity', 0.3)
                vm.svg_right_side.selectAll('#side_lines')
                    .style('stroke-width', 3)
                    .style('opacity', 0.3)
                d3.selectAll('.lc' + d)
                    // .attr('r', vm.dot_radius(data_left.length) + 3)
                    .attr('r', dot_radius + 3)
                    .style('opacity', 1.0)
                d3.selectAll('.lp' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                d3.selectAll('.ls' + d)
                    .style('stroke-width', 3)
                    .style('opacity', 1.0)
                vm.svg_right.selectAll("#last_path").remove();
                vm.svg_right.selectAll("#last_path_text").remove();
                hit_circles_text = vm.svg_right.selectAll("last_path_text")
                    .data([0,1,2,3,4,5])
                    .enter()
                    .append('text')
                    .attr('x', d2 => last_5_hits[d][d2][0])
                    .attr('y', d2 => last_5_hits[d][d2][1])
                    .style('font-size', '20px')
                    .style('font-weight', 'bold')
                    .attr('id','last_path_text')
                    .text(d2 => round_list[d] - 4 + d2)
                filepath = './raw/'+ file_list[d];
                console.log(filepath);
                var video_tag = document.getElementById('video_id');
                video_tag.src = filepath;
                video_tag.play();
            })
        loss_cells = loss_rows.selectAll("td")
            .data(d => info_list[d])
            .enter()
            .append("td")
            .text(d => d);
        sortTable(document.getElementById("loss_table"), 0, 1);
    },
    draw_path_lines: function() {
        vm.svg_left.selectAll("#path_lines").remove();
        var bundleLine = d3.line().curve(d3.curveBundle.beta(tension));
        path_lines = vm.svg_left.selectAll("path_lines")
            .data(bundled_paths)
            .enter()
            .append('path')
            .attr('id', 'path_lines')
            .attr('class', d => 'p' + d.index)
            .attr("d", d => bundleLine(d.path))
            // .style('stroke', d => groupColors(d.g))
            .style('stroke', d => `url(#${'grad'+d.g})`)
            .style('stroke-width', '2.5')
            .style('fill', 'none')
            .style('opacity', path_line_opacity)
    },
    draw_path_lines_right: function() {
        vm.svg_right.selectAll("path_lines").remove();
        var bundleLine = d3.line().curve(d3.curveBundle.beta(tension));
        path_lines = vm.svg_right.selectAll("path_lines")
            .data(bundled_paths_right)
            .enter()
            .append('path')
            .attr('id', 'path_lines')
            .attr('class', d => 'lp' + d.index)
            .attr("d", d => bundleLine(d.path))
            // .style('stroke', d => groupColors(d.g))
            .style('stroke', d => `url(#${'grad2'+d.g})`)
            .style('stroke-width', '2.5')
            .style('fill', 'none')
            .style('opacity', path_line_opacity)
    },
    draw_arrow: function () {
        if (landing == 'top') {
            var vec = [top_lens_left[0] - bot_lens_left[0], top_lens_left[1] - bot_lens_left[1]];
            var r_vec = rotate(vec, 30, arrow_size);
            var r_vec2 = rotate(vec, -30, arrow_size);
            var points = bot_lens_left[0] + ',' + bot_lens_left[1] + ' '
                + (bot_lens_left[0] + r_vec[0]) + ',' + (bot_lens_left[1] + r_vec[1]) + ' '
                + (bot_lens_left[0] + r_vec2[0]) + ',' + (bot_lens_left[1] + r_vec2[1]);
            arrow_left1 = vm.svg_left.append('line')
                .attr("x1", bot_lens_left[0])
                .attr("y1", bot_lens_left[1])
                .attr("x2", top_lens_left[0])
                .attr("y2", top_lens_left[1])
                .attr('id', 'arrow')
                .style('stroke', 'black')
                .style('stroke-width', '3')
                .style('opacity',1.0)
            arrow_left2 = vm.svg_left.append('polygon')
                .attr('points', points)
                .style('fill', 'black')
                .style('opacity', 1.0)
            arrow_right1 = vm.svg_right.append('line')
                .attr("x1", bot_lens_left[0])
                .attr("y1", bot_lens_left[1])
                .attr("x2", top_lens_left[0])
                .attr("y2", top_lens_left[1])
                .attr('id', 'arrow')
                .style('stroke', 'black')
                .style('stroke-width', '3')
            arrow_right2 = vm.svg_right.append('polygon')
                .attr('points', points)
                .style('fill', 'black')
            points = bot_lens_left[1] + ',' + (side_y + 5 + 7)  + ' '
                + (bot_lens_left[1] + 10) + ',' + (side_y + 7) + ' '
                + (bot_lens_left[1])  + ',' + (side_y - 5 + 7);
            arrow_side_left1 = vm.svg_left_side.append('line')
                .attr("x1", bot_lens_left[1])
                .attr("y1", side_y + 7)
                .attr("x2", top_lens_left[1])
                .attr("y2", side_y + 7)
                .attr('id', 'arrow')
                .style('stroke', 'black')
                .style('stroke-width', '2')
            arrow_side_left2 = vm.svg_left_side.append('polygon')
                .attr('points', points)
                .style('fill', 'black')
                .attr('id', 'arrow')
            arrow_side_right1 = vm.svg_right_side.append('line')
                .attr("x1", bot_lens_left[1])
                .attr("y1", side_y + 7)
                .attr("x2", top_lens_left[1])
                .attr("y2", side_y + 7)
                .attr('id', 'arrow')
                .style('stroke', 'black')
                .style('stroke-width', '2')
            arrow_side_right2 = vm.svg_right_side.append('polygon')
                .attr('points', points)
                .style('fill', 'black')
                .attr('id', 'arrow')
        } else if (landing == 'bot') {
        } 
    },
    update_arrow: function () {
       if (landing == 'top') {
            let vec = [top_lens_left[0] - bot_lens_left[0], top_lens_left[1] - bot_lens_left[1]];
            let r_vec = rotate(vec, 30, arrow_size);
            let r_vec2 = rotate(vec, -30, arrow_size);
            let points = bot_lens_left[0] + ',' + bot_lens_left[1] + ' '
                + (bot_lens_left[0] + r_vec[0]) + ',' + (bot_lens_left[1] + r_vec[1]) + ' '
                + (bot_lens_left[0] + r_vec2[0]) + ',' + (bot_lens_left[1] + r_vec2[1]);
            arrow_left1.attr("x1", bot_lens_left[0])
                .attr("y1", bot_lens_left[1])
                .attr("x2", top_lens_left[0])
                .attr("y2", top_lens_left[1])
            arrow_left2.attr('points', points)

            vec = [top_lens_right[0] - bot_lens_right[0], top_lens_right[1] - bot_lens_right[1]];
            r_vec = rotate(vec, 30, arrow_size);
            r_vec2 = rotate(vec, -30, arrow_size);
            points = bot_lens_right[0] + ',' + bot_lens_right[1] + ' '
                + (bot_lens_right[0] + r_vec[0]) + ',' + (bot_lens_right[1] + r_vec[1]) + ' '
                + (bot_lens_right[0] + r_vec2[0]) + ',' + (bot_lens_right[1] + r_vec2[1]);
            arrow_right1.attr("x1", bot_lens_right[0])
                .attr("y1", bot_lens_right[1])
                .attr("x2", top_lens_right[0])
                .attr("y2", top_lens_right[1])
            arrow_right2.attr('points', points)

            points = bot_lens_left[1] + ',' + (side_y + 5 + 7)  + ' '
                + (bot_lens_left[1] + 10) + ',' + (side_y + 7) + ' '
                + (bot_lens_left[1])  + ',' + (side_y - 5 + 7);
            // arrow_side_left1.attr("x1", bot_lens_left[1])
            //     .attr("y1", side_y + 7)
            //     .attr("x2", top_lens_left[1])
            //     .attr("y2", side_y + 7)
            // arrow_side_left2.attr('points', points)
            // arrow_side_right1.attr("x1", bot_lens_left[1])
            //     .attr("y1", side_y + 7)
            //     .attr("x2", top_lens_left[1])
            //     .attr("y2", side_y + 7)
            // arrow_side_right2.attr('points', points)
        } else if (landing == 'bot') {
        }
    },
    draw_histogram: function (x, y) {
        vm.svg_hist.selectAll("*").remove();
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };
        const innerWidth = 400 - margin.left - margin.right;
        const innerHeight = 300 - margin.top - margin.bottom;
        // console.log(x, y)
        const inWindows = inWindow(x, y, 'bot');
        // console.log(inWindows)
        let c = '';
        vm.svg_left.selectAll("#color_window")
            .attr("stroke", "none");
        inWindows.forEach(w => {
            c = c.concat(left_colormap[w]);
            vm.svg_left.select('.w'+ w)
            .attr("stroke", "grey")
            .style('stroke-width', '2');
        })
        // console.log(c)
        const data = [];
        for(var i=0; i<6; i++) {
            data.push({
                color: i,
                count: 0,
            })
        }
        for (var i = 0; i < c.length; i++) {
            data[parseInt(c.charAt(i))].count++;
        }
        
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.color))
            .range([0, innerWidth])
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) + 1])
            .range([innerHeight, 0])
            
        const g = vm.svg_hist.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
       
        g.append('g').call(
            d3.axisLeft(yScale)
            .ticks(d3.max(data, d => d.count) + 1)
            .tickFormat(d => d3.format('d')(d))
        )
            
        g.selectAll('rect').data(data)
            .enter().append('rect')
            .attr('x', d => xScale(d.color))
            .attr('y', d => yScale(d.count))
            .attr('height', d => (innerHeight - yScale(d.count)))
            .attr('width', xScale.bandwidth())
            .attr("fill",  d => groupColors(d.color));

        // let maxColor = data.reduce((max, d) => max.count > d.count ? max : d);

        // vm.svg_left.append("rect")
        //     .attr("x", reversed_windows[window][0] - region_width / 2)
        //     .attr("y", reversed_windows[window][1] - region_height / 2)
        //     .attr("width", region_width)
        //     .attr("height", region_height)
        //     .attr("id", 'window')
        //     .attr("class", 'window')
        //     .attr("stroke", "grey")
        //     .style('stroke-width', '2')
        //     .attr("fill-opacity", 0)
    },
    draw_histogram_right: function (t, b, window) {
        vm.svg_right.select(".window").remove();
        // const data = [];
        // for(var i=0; i<6; i++) {
        //     data.push({
        //         color: i,
        //         count: 0,
        //     })
        // }
        // for (var i = 0; i < right_last_hitmap[t][b][window].length; i++) {
        //     data[parseInt(right_last_hitmap[t][b][window].charAt(i))].count++;
        // }

        // let maxColor = data.reduce((max, d) => max.count > d.count ? max : d);

        vm.svg_right.append("rect")
            .attr("x", reversed_windows[window][0] - region_width / 2)
            .attr("y", reversed_windows[window][1] - region_height / 2)
            .attr("width", region_width)
            .attr("height", region_height)
            .attr("id", 'window')
            .attr("class", 'window')
            .attr("stroke", "grey")
            .style('stroke-width', '2')
            .attr("fill-opacity", 0)
    },  
};

function selectPlayerFunc() {
    let p = document.getElementById("left-player-select");
    var o = document.getElementById("left-opponent-select");
    o.length = 2;
    player_selected = p.value;

    opponent_list = [];
    const tables = Object.keys(raw_data);
    tables.forEach(table => {
        const [player, opponent] = table.split('_');
        if(player == player_selected) {
            opponent_list.push(opponent);
            var option = document.createElement("option");
            option.text = opponent;
            option.value = opponent;
            option.id = 'opponent_option';
            o.add(option);
        }
    })
    o.options[1].selected = true;
    opponent_selected = o.value;
    obj.reload_court_left(true);
}

function selectPlayerFuncRight(){
    let p = document.getElementById("right-player-select");
    var o = document.getElementById("right-opponent-select");
    o.length = 2;
    player_selected_right = p.value;

    opponent_list_right = [];
    const tables = Object.keys(raw_data);
    tables.forEach(table => {
        const [player, opponent] = table.split('_');
        if(player == player_selected_right) {
            opponent_list_right.push(opponent);
            var option = document.createElement("option");
            option.text = opponent;
            option.value = opponent;
            option.id = 'opponent_option';
            o.add(option);
        }
    })
    o.options[1].selected = true;
    opponent_selected_right = o.value;
    obj.reload_court_right(true);
}

function selectOpponentFunc() {
    let o = document.getElementById("left-opponent-select");
    // var oppoPlayerSelect_index = t.options[t.selectedIndex].value;
    // oppo_index = oppoPlayerSelect_index;
    opponent_selected = o.value;
    obj.reload_court_left(true);
}

function selectOpponentFuncRight() {
    let o = document.getElementById("right-opponent-select");
    // var oppoPlayerSelectRight = t.options[t.selectedIndex].value;
    // oppo_index_right = oppoPlayerSelectRight;
    opponent_selected_right = o.value;
    obj.reload_court_right(true);
}

function selectLandingFunc(){
    obj.draw_map_left(true);
    obj.find_distrib_left(true);
    obj.find_entropy_left(true);
    obj.draw_map_right(true);
    obj.find_distrib_right(true);
    obj.find_entropy_right(true);
}

function selectSetFunc(){
    obj.draw_map_left(true);
    obj.find_entropy_left(true);
    obj.find_distrib_left(true);
}

function selectSetFuncRight(){
    obj.draw_map_right(true);
    obj.find_distrib_right(true);
}

function checkHalfFunc() {
    obj.draw_map_left(true);
    obj.find_entropy_left(true);
    obj.find_distrib_left(true);
}

function checkHalfFuncRight() {
    obj.draw_map_right(true);
    obj.find_entropy_right(true);
    obj.find_distrib_right(true);
}

function toggleLastPaths() {
    document.getElementById("toggle-colormap").checked = !document.getElementById("toggle-lastpath").checked;
    obj.draw_map_left(true);
    obj.draw_map_right(true);
}

function toggleColorMap() {
    document.getElementById("toggle-lastpath").checked = !document.getElementById("toggle-colormap").checked;
    obj.draw_map_left(true);
    obj.draw_map_right(true);
}

function switchTabs(evt, tab) {
    var i, x, tablinks;
    x = document.getElementsByClassName("tab");
    for (i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablink");
    for (i = 0; i < x.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" current", "");
    }
    document.getElementById(tab).style.display = "flex";
    evt.currentTarget.className += " current";
}

function updateSimilarityFunc(slider_value){
    similarity = slider_value;
    obj.draw_map_left(true);
    obj.draw_map_right(true);
}

function updatePathOpacityFunc(slider_value){
    path_line_opacity = slider_value;
    vm.svg_left.selectAll("#path_lines")
        .style('opacity', slider_value);
    vm.svg_right.selectAll("#path_lines")
        .style('opacity', slider_value);
}

function updateFilterState(filter_state){
    t = document.getElementById("left-player-select");
    var playerSelect = t.options[t.selectedIndex].value;
    t = document.getElementById("left-opponent-select");
    var oppoPlayerSelect_index = t.options[t.selectedIndex].value;
    player_selected = playerSelect;
    oppo_index = oppoPlayerSelect_index;
    t = document.getElementById("right-player-select");
    var playerSelectRight = t.options[t.selectedIndex].value;
    t = document.getElementById("right-opponent-select");
    var oppoPlayerSelectRight_index = t.options[t.selectedIndex].value;
    player_selected_right = playerSelectRight;
    oppo_index_right = oppoPlayerSelectRight_index;

    if(filter_state == '3'){
        region_filter_state = 'LocationOn';
        data_left = [];
        document.getElementById("lens-size").disabled = false;
        d3.selectAll("#region_rect").remove();
    }
}

function updateRadius(slider_value){
    lens_radius = parseFloat(slider_value);
    vm.svg_left.select("#opponent")
        .attr("r", lens_radius)
    vm.svg_left.select("#me")
        .attr("r", lens_radius)
    vm.svg_right.select("#opponent")
        .attr("r", lens_radius)
    vm.svg_right.select("#me")
        .attr("r", lens_radius)
    vm.svg_left_side.select("#opponent")
        .attr("rx", lens_radius)
    vm.svg_left_side.select("#me")
        .attr("rx", lens_radius)
    vm.svg_right_side.select("#opponent")
        .attr("rx", lens_radius)
    vm.svg_right_side.select("#me")
        .attr("rx", lens_radius)
    obj.draw_map_left(false);
    obj.draw_map_right(false);
    d3.selectAll("#variety_table_body").remove();
    d3.selectAll("#left_entropy_table_body").remove();
    d3.selectAll("#right_entropy_table_body").remove();
}
function updateRadiusEnd() {
    if (!player_selected || oppo_index == -1) {
        return;
    }
    obj.draw_map_left(true);
    obj.draw_map_right(true);
    obj.find_distrib_left(true);
    obj.find_distrib_right(true);
    obj.find_entropy_left(true);
    obj.find_entropy_right(true);
}

function sortTableDesc(table) {
    var switching, i, shouldSwitch;
    var rows = table.rows; 
    switching = true;
    while (switching) {
        switching = false;
        rows = table.rows;
        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[0];
            y = rows[i + 1].getElementsByTagName("TD")[0];
            if (parseFloat(x.innerHTML.toLowerCase()) < parseFloat(y.innerHTML.toLowerCase())) {
                shouldSwitch = true;
                break;
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
        }
    }
}

function sortTableAsc(table) {
    var switching, i, shouldSwitch;
    if(table) {
        var rows = table.rows; 
        switching = true;
        while (switching) {
            switching = false;
            rows = table.rows;
            for (i = 1; i < (rows.length - 1); i++) {
                shouldSwitch = false;
                x = rows[i].getElementsByTagName("TD")[0];
                y = rows[i + 1].getElementsByTagName("TD")[0];
                if (parseFloat(x.innerHTML.toLowerCase()) > parseFloat(y.innerHTML.toLowerCase())) {
                    shouldSwitch = true;
                    break;
                }
            }
            if (shouldSwitch) {
                rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                switching = true;
            }
        }
    }
}

function sortTable(table, col1, col2) {
    var switching, i, j, x, y, shouldSwitch;
    if(table) {
        var rows = table.rows; 
        if(col1 == 0) {
            switching = true;
            while (switching) {
                switching = false;
                for (i = 1; i < (rows.length - 1); i++) {
                    shouldSwitch = false;
                    x = rows[i].getElementsByTagName("TD")[col1];
                    y = rows[i + 1].getElementsByTagName("TD")[col1];
                    if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                    }
                }
                if (shouldSwitch) {
                    rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                    switching = true;
                }
            }
        } else {
            switching = true;
            while (switching) {
                switching = false;
                for (i = 1; i < (rows.length - 1); i++) {
                    shouldSwitch = false;
                    x = rows[i].getElementsByTagName("TD")[col1];
                    y = rows[i + 1].getElementsByTagName("TD")[col1];
                    if (parseInt(x.innerHTML) > parseInt(y.innerHTML)) {
                        shouldSwitch = true;
                        break;
                    }
                }
                if (shouldSwitch) {
                    rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
                    switching = true;
                }
            }
        }
        for (i = 1; i < (rows.length - 1); i++) {
            for (j = i + 1; j < rows.length; j++) {
                shouldSwitch = false;
                x = rows[i].getElementsByTagName("TD")[col1];
                y = rows[j].getElementsByTagName("TD")[col1];
                a = rows[i].getElementsByTagName("TD")[col2];
                b = rows[j].getElementsByTagName("TD")[col2];
                if (x.innerHTML.toLowerCase() == y.innerHTML.toLowerCase()) {
                    if(col1 == 0){
                        if (a.innerHTML.toLowerCase() > b.innerHTML.toLowerCase()) {
                            rows[i].parentNode.insertBefore(rows[j], rows[i]);
                        }
                    } else {
                        if (parseInt(a.innerHTML) > parseInt(b.innerHTML)) {
                            rows[i].parentNode.insertBefore(rows[j], rows[i]);
                        }
                    }
                }
            }
        }
    }
}