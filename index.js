const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')
const merge = require('lodash.merge')
const replaceInZipFile = require('replace-in-zipfile')

const opts = require('rc')(process.env.ssb_appname || 'ssb').downloads || {}

console.log(opts)

const magicData = fs.readFileSync(opts.magic)

const server = http.createServer((req, res) => {
  const [_, platform, hexdata, filename] = req.url.split('/')

  const platformPath = path.join(opts.platforms, platform) + '.zip'
  console.error(platformPath)
  fs.stat(platformPath, err => {
    if (err) {
      res.writeHead(404)
      return res.end('Unknown platform')
    }
    if (!hexdata || hexdata.length > 8192 || Buffer.from(hexdata, 'hex').toString()[0] !== '{') {
      res.writeHead(400)
      return res.end('Invalid config')
    }
    let o
    try {
      o = JSON.parse(Buffer.from(hexdata, 'hex').toString())
    } catch(e) {
      res.writeHead(400)
      return res.end('Invalid config')
    }
    if (typeof o.profile !== 'string') {
      res.writeHead(400)
      return res.end('no profile')
    }
    const profile = o.profile
    const profilePath = path.join(opts.profiles, profile) + '.json'
    let profileData
    try {
      profileData = JSON.parse(fs.readFileSync(profilePath))
    } catch(e) {
      console.error(e)
      res.writeHead(400)
      return res.end('invalid profile')
    }
    console.error(`profile: ${profile}`)

    if (typeof o.config !== 'object') {
      res.writeHead(400)
      return res.end('no config')
    }
    const config = merge({}, profileData, o.config)
    const configJson = JSON.stringify(config, null,2)
    console.error(configJson)

    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    fs.createReadStream(platformPath)
      .pipe(replaceInZipFile(magicData, Buffer.from(configJson)))
      .pipe(res)
  })
})

server.listen(8080, (err)=>{
  if (err) return console.error(err)
  const {address, port} = server.address()
  console.log(`Listening on ${address}:${port}`)
})
