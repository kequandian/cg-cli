#!/usr/bin/env node

const program = require('commander');
const axios = require('axios')
// const yaml = require('yaml')
const fs = require('fs');
const path = require(`path`);
const dotenv = require('dotenv');

const { exit } = require('process');
const { stringify } = require('querystring');
const { table } = require('console');
// var shell = require("shelljs");
// const https = require('https')

const defaultEndpoint='http://localhost:8080'
dotenv.config()
var endpoint = process.env.ENDPOINT===undefined ? defaultEndpoint : process.env.ENDPOINT


program
     .command('show-endpoint')
     .action(function () {
       console.log(endpoint)
     })  

program
     .command('show-local')
     .action(function () {
        const resourcePath = 'src/main/resources/sql'
        console.log(resourcePath)
        fs.readdirSync(path.join(resourcePath), { withFileTypes: false })
        .filter(function (file) {
            return file.endsWith('-schema.sql')
        })
        .forEach(file => {
            console.log('=>', file)
        });
     })

// program
//     .command('query-via-raw-http-sample')
//     .action(function () {
//       const options = {
//         hostname: 'localhost',
//         port: 8080,
//         path: '/api/cg/field/default',
//         method: 'GET'
//       }
      
//       const req = https.request(options, res => {
//         console.log(`statusCode: ${res.statusCode}`)
//         res.on('data', d => {
//           process.stdout.write(d)
//         })
//       })
      
//       req.on('error', error => {
//         console.error(error)
//       })
      
//       req.end()
//     });

program
    .command('show-default')
    .action(function () {
        axios.get(`${endpoint}/api/cg/field/default`)
        .then(res => {
            var list = res.data.data
            list.forEach(it => console.log(it.name, it.model_name));
        })
        .catch(err => {
            console.log('Error: ', err.message);
        });
    });

program
    .command('show-default-field <field>')
    .action(function (field) {
      axios.get(`${endpoint}/api/cg/field/default/` + field)
      .then(res => {
          console.log(res.data.data)
      })
      .catch(err => {
          console.log('Error: ', err.message);
      });
    });

program
/**
 * {
  "project":"nft",
  "module":"nft",
  "submodule": "player",
  "tableName":"cg_entity_resource",
  "sql":"cg-codegen-test-schema.sql"
}
 */
    .command('update-table-entity [table-name]')
    .action(function (tableName) {
      // check
      if (!fs.existsSync('./pom.xml')) {
          console.log('pom.xml not fould, not an maven project !')
          return
      }

      // main
      const api = '/api/cg/generate/code/base'

      // get project 
      let project = path.basename(path.resolve("."))
      let output = path.dirname(path.resolve("."))
      // console.log('project=',project,', output=',output)

      // find module and submodule
      var module, submodule
      const modulePath = 'src/main/java/com/jfeat'
      
      // module
      fs.readdirSync(modulePath, { withFileTypes: false })
      .filter(function (file) {
         return fs.statSync(path.join(modulePath, file)).isDirectory();
      })
      .forEach(file => {
        module = file
      });
      // submodule
      fs.readdirSync(path.join(modulePath, module), { withFileTypes: false })
      .filter(function (file) {
         return fs.statSync(path.join(modulePath, module, file)).isDirectory();
      })
      .forEach(file => {
        submodule = file
      });
      // continue to correct module, submodule
      if( ! fs.existsSync(path.join(modulePath, module, submodule, "api"))){

          fs.readdirSync(path.join(modulePath, module, submodule), { withFileTypes: false })
          .filter(function (file) {
            return fs.statSync(path.join(modulePath, module, submodule, file)).isDirectory();
          })
          .forEach(file => {
            module = submodule
            submodule = file
          });
      }
      // replace submodule
      if (module == 'module'){
          module = submodule
          submodule = undefined
      }
      //// end find module/submodule

      // table name
      var sqlData = {}
      const resourcePath = 'src/main/resources/sql'
      fs.readdirSync(path.join(resourcePath), { withFileTypes: false })
      .filter(function (file) {
          return file.endsWith('-schema.sql')
       })
      .forEach(file => {
          //  console.log(file)
          const data = fs.readFileSync(path.join(resourcePath, file), {encoding:'utf8', flag:'r'})
          data.split(/\r?\n/).forEach(line =>  {
            line = line.trim()

            if(line.toLowerCase().startsWith("create table ")){
              line = line.substring("create table ".length)
              line = line.trim()
              line = line.replace('(','')
              line = line.replace('`','')
              line = line.replace('`','')
              let table = line.trim()

              if( tableName === undefined || tableName === '' ){          
                 console.log(table);
              }else{
                sqlData[table] =  path.join(resourcePath, file)
              }
            }
          })
      });
      if( tableName === undefined || tableName === '' ){
        return 
      }
      // console.log(tableName, 'sqlData', sqlData)
      let sql_log =  sqlData[tableName]
      let sql  = path.join(path.resolve("./"), sql_log)
      // console.log(sql_log, sql)

      // START
      const option  = {
        project: project,
        module: module,
        submodule: submodule,
        tableName: tableName,
        sql: sql,
        outputPath: output
      }

      const option_log  = {
        project: project,
        module: module,
        submodule: submodule,
        tableName: tableName,
        sql: sql_log
      }
      if (option_log.submodule === undefined){
        delete option_log.submodule
      }
      // console.log(option)

      console.log(`${endpoint}${api}`, option_log)
      axios.post(`${endpoint}${api}`, option)
      .then(res => {
          console.log(...res.data.data)
      })
      .catch(err => {
          console.log('Error: ', err.message);
      });
    });



    // onemay 
    function do_sql_table_hash(sqlData){
       // table name
       const resourcePath = 'src/main/resources/sql'
       if(!fs.existsSync(resourcePath)){
         console.log(resourcePath, ' not exists !')
         return
       }

       fs.readdirSync(path.join(resourcePath), { withFileTypes: false })
       .filter(function (file) {
           return file.endsWith('-schema.sql')
       })
       .forEach(file => {

           //  console.log(file)
           const data = fs.readFileSync(path.join(resourcePath, file), {encoding:'utf8', flag:'r'})
           data.split(/\r?\n/).forEach(line =>  {
             line = line.trim()

             if(line.toLowerCase().startsWith("create table ")){
               line = line.substring("create table ".length)
               line = line.trim()
               line = line.replace('(','')
               line = line.replace('`','')
               line = line.replace('`','')
               let table = line.trim()

               //if( tableName === undefined || tyoeof(tableName) == 'object' || tableName === '' ){          
               //  console.log(table);
               //}else{
                 sqlData[table] =  path.join(resourcePath, file)
               //}
             }
           })
       });
    }


    function do_crud_json(tableName, crud_fn){
 
        // get project 
        let project = path.basename(path.resolve("."))
        let output = path.dirname(path.resolve("."))
        // console.log('project=',project,', output=',output)

        // find module and submodule
        const modulePath = 'src/main/java/com/jfeat'

        var module, submodule
        if(fs.existsSync(modulePath)){
          // module
          fs.readdirSync(modulePath, { withFileTypes: false })
          .filter(function (file) {
            return fs.statSync(path.join(modulePath, file)).isDirectory();
          })
          .forEach(file => {
            module = file
          });
          // submodule
          fs.readdirSync(path.join(modulePath, module), { withFileTypes: false })
          .filter(function (file) {
            return fs.statSync(path.join(modulePath, module, file)).isDirectory();
          })
          .forEach(file => {
            submodule = file
          });
          // continue to correct module, submodule
          if( ! fs.existsSync(path.join(modulePath, module, submodule, "api"))){

              fs.readdirSync(path.join(modulePath, module, submodule), { withFileTypes: false })
              .filter(function (file) {
                return fs.statSync(path.join(modulePath, module, submodule, file)).isDirectory();
              })
              .forEach(file => {
                module = submodule
                submodule = file
              });
          }
          // replace submodule
          if (module == 'module'){
              module = submodule
              submodule = undefined
          }
          //// end find module/submodule
        }
        if(module===undefined){
          console.log('module is null, pls provide module name !')
          return false
        }

        //console.log(tableName, 'sqlData', sqlData)
        var sqlData = {}
        do_sql_table_hash(sqlData)

        let sql_log =  sqlData[tableName]
        let sql  = path.join(path.resolve('./'), sql_log)
        
        // START
        const option  = {
          project: project,
          module: module,
          submodule: submodule,
          tableName: tableName,
          sql: sql,
          outputPath: output,
        }

        if(crud_fn){
          crud_fn(option)
        }

        // just gen crud.onemany.json config
        fs.writeFileSync('crud.json', JSON.stringify(option, (k, v) => v === undefined ? null : v, 2))
    }


  program
    // onemany
    // {
    //   "project":"cg",
    //   "module":"cg",
    //   "submodule": "test",
    //   "tableName":"cg_entity_resource",
    //   "sql":"cg-codegen-test-schema.sql",
    //   "slaves":
    //   [
    //     {
    //       "tableName": "cg_module_player",
    //       "masterId": "entity_resource_id"
    //     }
    //   ]
    // }  
    .command('do-onemany-native [table-name]')
    .action(function (tableName) {
      const api = '/api/cg/generate/code'

      // no args, print out all the tables
      if(tableName == undefined || typeof(tableName) == 'object' || tableName === ''){
        var sqlData = {}
        do_sql_table_hash(sqlData)

        Object.keys(sqlData).forEach((k)=>{
          console.log(k);
        })
        return
      }


      // main
      if (!fs.existsSync('./crud.json')) {
        console.log('crud.json not found, pls edit crud.json first ..!')
        crud_json_exists = true

        do_crud_json(tableName)
        return
      }
      
      const data = fs.readFileSync('crud.json', {encoding:'utf8', flag:'r'})
      const option = JSON.parse(data)

      // const option_log  = {
      //   project: option.project,
      //   module: option.module,
      //   submodule: option.submodule,
      //   tableName: option.tableName,
      //   sql: option.sql,
      //   outputPath: option.outputPath,
      //   slaves: option.slaves
      // }
      const option_log = option
      console.log(`${endpoint}${api}`, option_log)
      
      
      // post to endpoint
      axios.post(`${endpoint}/${api}`, option)
      .then(res => {
          console.log(...res.data.data)
      })
      .catch(err => {
          console.log('Error: ', err);
      });
    });



  function do_code_generation(tableName, crud_fn, gencode){
    const api = '/api/cg/generate/code'

    // console.log('crud-fn: ', crud_fn, " table-action:", takeAction)

    // no args, print out all the tables
    if(tableName == undefined || typeof(tableName) == 'object' || tableName === ''){
      var sqlData = {}
      do_sql_table_hash(sqlData)

      Object.keys(sqlData).forEach((k)=>{
        console.log(k);
      })
      return
    }


    // main
    if (!fs.existsSync('./crud.json')) {
      console.log('crud.json not found, pls edit crud.json first ..!')
      crud_json_exists = true

      do_crud_json(tableName, crud_fn)
      return
    }
    
    const data = fs.readFileSync('crud.json', {encoding:'utf8', flag:'r'})
    const option = JSON.parse(data)
    if(option.module==undefined){
       console.log('module should not be null !')
       return
    }

    // const option_log  = {
    //   project: option.project,
    //   module: option.module,
    //   submodule: option.submodule,
    //   tableName: option.tableName,
    //   sql: option.sql,
    //   outputPath: option.outputPath,
    //   slaves: option.slaves
    // }
    const option_log = option
    console.log(`${endpoint}${api}`, option_log)

    // post to endpoint
    if(gencode){
      axios.post(`${endpoint}/${api}`, option_log)
      .then(res => {
          console.log(...res.data.data)
      })
      .catch(err => {
          console.log('Error: ', err);
      });
    }
  }



  program
    .command('do-entity [table-name] ')
    .action(function (tableName) {
      do_code_generation(tableName, log=>{
          log.mask = 'entity'
      }, true)
    });

    program
      .command('do-master [table-name] ')
      .action(function (tableName) {
        do_code_generation(tableName, ()=>{}, true)
      });

    program
    // onemany
    // {
    //   "project":"cg",
    //   "module":"cg",
    //   "submodule": "test",
    //   "tableName":"cg_entity_resource",
    //   "sql":"cg-codegen-test-schema.sql",
    //   "slaves":
    //   [
    //     {
    //       "tableName": "cg_module_player",
    //       "masterId": "entity_resource_id"
    //     }
    //   ]
    // }  
    .command('do-onemany [table-name]')
    .action(function (tableName) {

      const slaves = [
        {
          tableName: tableName,
          masterId: 'master_id:id',
          itemsKey: "items"
        }
      ]
      do_code_generation(tableName, log=>{
          log.slaves = slaves
      }, true)
    });


program.parse(process.argv);
