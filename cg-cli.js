#!/usr/bin/env node

let program = require('commander');
const axios = require('axios')
// const yaml = require('yaml')
let fs = require('fs');
let path = require(`path`);
const { exit } = require('process');
// var shell = require("shelljs");
// const https = require('https')
let api = '/api/cg/generate/code/base'

var endpoint='http://localhost:8080'

program
     .command('show-ep')
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

program
     .command('endpoint <endpoint>')
     .action(function (ep) {
       endpoint = ep
       console.log('new endpoint=', endpoint)
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
      if (!fs.existsSync('./pom.xml')) {
          console.log('pom.xml not fould, not an maven project !')
          return
      }

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

      console.log(`${endpoint}/${api}`, option_log)
      axios.post(`${endpoint}/${api}`, option)
      .then(res => {
          console.log(...res.data.data)
      })
      .catch(err => {
          console.log('Error: ', err.message);
      });
    });

program.parse(process.argv);
