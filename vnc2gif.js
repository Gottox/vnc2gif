/*
 * vnc2gif.js
 * Copyright (C) 2014 tox <tox@rootkit>
 *
 * Distributed under terms of the MIT license.
 */

var rfb = require('rfb2')
var Canvas = require("canvas");
var GIFEncoder = require('gifencoder');
var async = require('async');
var connect = require('connect');
var http = require('http');
var morgan = require('morgan');
var serveStatic = require('serve-static');
var qs = require('qs');

function handleConnection(req, res, next) {
	var query = qs.parse(req.url)
	var args = {
		host: query.host || 'localhost',
		port: query.port ? parseInt(params.query.port,10) : 5900,
		password: query.password || ''
	};
	var r = rfb.createConnection(args);

	var canvas;
	var gif;
	var ctx;

	r.on('connect', function() {
		res.writeHead(200, { 'Content-Type': 'image/gif' });
		canvas = new Canvas(r.width, r.height);
		gif = new GIFEncoder(r.width, r.height);
		gif.start();
		gif.setRepeat(0);   // 0 for repeat, -1 for no-repeat
		gif.setDelay(500);  // frame delay in ms
		gif.setQuality(10);
		ctx = canvas.getContext('2d');
		gif.createReadStream().pipe(res);
		console.log('connect')
		req.connection.on('end', function() {
			r.end();
			r = null;
		})
		r.stream.on('end', function() {
			gif.finish();
			res.end();
		})
	})
	.on('rect', function(rect) {
		if(r == null)
			return;
		var imgData = ctx.createImageData(rect.width, rect.height);
		for(var i = 0; i < rect.data.length; i++) {
			switch(i % 4) {
				case 0:
					imgData.data[i] = rect.data[i+2];
					break;
				case 2:
					imgData.data[i] = rect.data[i-2];
					break;
				default:
					imgData.data[i] = rect.data[i];
					break;
			}
		}
		console.log(rect);
		console.log('rect');
		ctx.putImageData(imgData, rect.x, rect.y);
		gif.addFrame(ctx);
		r.requestUpdate(false, 0, 0, r.width, r.height);
	});
}

var app = connect()
	.use(morgan('dev'))
	.use(serveStatic('public'))
	.use(handleConnection)

http.createServer(app).listen(3000);
