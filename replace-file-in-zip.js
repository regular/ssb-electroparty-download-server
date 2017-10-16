const ReplaceStream = require('binary-stream-replace');
const bl = require('bl')
const crc = require('crc')
const through = require('through')
const throughout = require('throughout')
const concat = require('concat-stream')

const EOCD = Buffer.from([0x06, 0x05, 0x4b, 0x50].reverse())
const CDFH = Buffer.from([0x02, 0x01, 0x4b, 0x50].reverse())

module.exports = function replaceZipFile(magicData, fileData) {
  const magicCrc = crc.crc32(magicData)
  console.error('magic', magicData.length, magicCrc.toString(16))

  const rs1 = ReplaceStream(EOCD, EOCD)
  const rs2 = ReplaceStream(CDFH, CDFH)

  let entries = []
  let offset = 0
  let currCDFHOffset
  let bufs

  function findEntry(offset) {
    return entries.find(e => e.offset === offset)
  }

  function makeLocalHeader(e) {
    // in e.buffers, we have a BufferList containing a central directory header
    let b = e.buffers
    let ret = new bl()
    ret.append(Buffer.from([0x04, 0x03, 0x4b, 0x50].reverse()))
    ret.append(b.slice(6, 32))
    let filenameLength = b.readUInt16LE(28)
    let extraFiledLength = b.readUInt16LE(30)
    ret.append(b.slice(46, 46 + filenameLength + extraFiledLength))
    return ret
  }

  function patchMagicCDFH(e) {
    let b = e.buffers.slice()
    b.writeUInt32LE(crc.crc32(fileData), 16)
    b.writeUInt32LE(fileData.byteLength, 20)
    b.writeUInt32LE(fileData.byteLength, 24)
    b.writeUInt32LE(offset, 42)
    e.buffers = new bl()
    e.buffers.append(b)
  }

  function processCDFH(e) {
    let b = e.buffers
    let method = b.readUInt16LE(10)
    let crc32 = b.readUInt32LE(16)
    let compressedSize = b.readUInt32LE(20)
    let uncompressedSize = b.readUInt32LE(24)
    let filenameLength = b.readUInt16LE(28)
    let extraFiledLength = b.readUInt16LE(30)
    let commentLength = b.readUInt16LE(32)
    let filename = b.slice(46, 46 + filenameLength).toString('ascii')

    //console.error(method, uncompressedSize, compressedSize, filename, crc32.toString(16))
    // TODO: this is not striclty correct, because there might be a CRC32 collision. Living on the edge!
    if (compressedSize === magicData.length && uncompressedSize == magicData.length && crc32 === magicCrc) {
      console.error('found magic file:', filename)
      patchMagicCDFH(e)
      let lh = makeLocalHeader(e)
      process.stdout.write(lh.slice())
      process.stdout.write(fileData)
      offset += lh.length + fileData.byteLength
    }
    return 46 + filenameLength + extraFiledLength + commentLength
  }

  return throughout(
    throughout(rs1, rs2),
    through( function write(data) {

      let isCDFH = data.equals(CDFH)
      let isEOCD = data.equals(EOCD)
      
      // does a directory entry end here?
      if (isCDFH || isEOCD) {
        if (bufs) entries.push({
          offset: currCDFHOffset,
          buffers: bufs
        })
        bufs = null
      }

      // does a new entry start?
      if (data.equals(CDFH)) {
        //console.error('CDFH found at', offset)
        currCDFHOffset = offset
        bufs = new bl()
      } else if (data.equals(EOCD)) {
        console.error('EOCD found at', offset)
        EOCDOffset = offset
        bufs = new bl()
      }
      if (bufs) {
        bufs.append(data)
      }
      offset += data.length
      this.queue(data)
    }, function end() {
      console.error('filezise before', offset)
      console.error(entries.length, 'entries')
      /*
      entries.forEach( ({offset, buffers}) => {
        console.error('- ', offset, buffers.length)
      })
      */
      console.error('last EOCD at', EOCDOffset, ' size =', bufs.length)
      let o = bufs.readUInt32LE(16)
      let CDSize = bufs.readUInt32LE(12)
      console.error('Start of central directory:', o, 'size=', CDSize)
      let e, newEntries = []
      do {
        e = findEntry(o)
        if (e) {
          o += processCDFH(e)
          newEntries.push(e)
        }
      } while(e)

      // append new central directory
      CDSize = 0
      newEntries.forEach( e => {
        CDSize += e.buffers.length
        this.queue( e.buffers.slice() )
      })
      console.error('Wrote new central directory at', offset, 'size=', CDSize)
      let newEOCD = bufs.slice()
      newEOCD.writeUInt32LE(offset, 16)
      this.queue(newEOCD)
    }
  ))
}
