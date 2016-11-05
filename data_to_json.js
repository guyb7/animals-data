'use strict'

const fs = require('fs')

const lineReader = require('readline').createInterface({
  input: fs.createReadStream(`${__dirname}/data.txt`)
})

const data = {
  fields: [],
  data: []
}

lineReader.on('line', (line) => {
  if (line.length === 0) {
    return
  }
  const fields = line.split(/\t/)
  if (fields[0] === 'HAGRID') {
    data.fields = fields.map((title) => {
      return title.replace(/\s+/g, '-').toLowerCase()
    })
  } else {
    data.data.push(fields)
    if (fields.length !== data.fields.length) {
      console.log('Wrong number of fields:')
      console.log(fields.length)
      console.log(fields)
      process.exit()
    }
  }
})

lineReader.on('close', () => {
  fs.writeFile(`${__dirname}/data.json`, JSON.stringify(data), (err) => {
    if(err) {
      return console.log(err)
    }
    console.log('data.json was successfuly created')
  })
})
