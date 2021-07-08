    var mysql = require('mysql')
    var http = require('http')
    const util = require('util')
    // var con = mysql.createConnection({
    //     host: '140.113.24.2',
    //     user: 'subproject3',
    //     password: 'frankec131b'
    // });
    var con  = mysql.createPool({
        connectionLimit : 10,
        host: '140.113.24.2',
        user: 'subproject3',
        password: 'frankec131b'
      });


    const query_db = function(my_sql){
        return new Promise(function(res,rej){
            con.query(my_sql, function(err, rows, fields){
                if(err) rej(rows);
                else res(rows);
            });
        });
    };

    var server = http.createServer(function(req, res){
        var all_tables_name_list = [];
        var all_tables_index_list = [];
        if(req.url == '/'){
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write('<html><body> index </body></html>');
            res.end();
        }
        else if(req.url == '/getData'){
            res.writeHead(200, { "Access-Control-Allow-Origin": "*", 'Content-Type': 'application/json' });
            var sql = 'show tables from badminton_heatmap';
            var json_data = {};
            query_db(sql).then(function(result){
                for (var i in result){
                    var split = result[i].Tables_in_badminton_heatmap.split('_');
                    // if (split[split.length-1] != 'predict'){
                    //     all_tables_name_list.push(result[i].Tables_in_hit_area_heatmap_Chou);
                    //     all_tables_index_list.push(i);
                    // }
                    all_tables_name_list.push(result[i].Tables_in_badminton_heatmap);
                    all_tables_index_list.push(i);

                }
                // console.log(all_tables_name_list);
            })
            .then(async function load_data(){
                for (var j=0; j< all_tables_name_list.length; j++){
                    sql_data = 'SELECT * FROM badminton_heatmap.' + all_tables_name_list[j] + ';'
                    // sql_data = 'SELECT * FROM hit_area_heatmap_Chou.hit_area_heatmap_AkaneYAMAGUCHI;'
                    console.log(j,all_tables_name_list.length,sql_data);
                    await query_db(sql_data).then(function(result2){
                        json_data[all_tables_name_list[j]] = result2;
                        console.log(j,all_tables_name_list[j]);
                        // console.log(result2);
                    });
                }
                // console.log(all_tables_name_list[0],json_data[all_tables_name_list[0]]);
                json_data = JSON.stringify(json_data);
                res.write(json_data);
                res.end();
            });
        }
        else{
            res.write('<html><body> error url </body></html>');
            res.end();
        }
    });

    server.listen(5500);
    console.log('c');