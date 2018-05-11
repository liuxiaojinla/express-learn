const express = require('express');
const crypto = require('crypto');
const request = require("request");
const parseStringSync = require('xml2js-parser').parseStringSync;
const router = express.Router();

function md5(text) {
	return crypto.createHash('md5').update(text).digest('hex');
}

function unifiedorder(payKey, payInfo, callback) {
	const url = 'https://api.mch.weixin.qq.com/pay/unifiedorder';
	payInfo = Object.assign({
		nonce_str: randomString(),
		trade_type: 'JSAPI',
	}, payInfo);
	payInfo.sign = md5(raw1(payInfo) + '&key=' + payKey).toUpperCase();
	request({
		url: url,
		method: 'POST',
		body: buildXml(payInfo),
	}, callback);
}

function buildXml(params) {
	let keys = Object.keys(params);
	let result = '<xml>';
	for (const key of keys) {
		result += '<' + key + '>' + params[key] + '</' + key + '>';
	}
	result += '</xml>';
	return result;
}

function randomString(len) {
	len = len || 32;
	const chars = 'ABCKEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789';
	let pwd = '';
	for (let i = 0; i < len; i++) {
		pwd += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return pwd;
}


function raw1(args) {
	let keys = Object.keys(args);
	keys = keys.sort();

	let result = '';
	for (const key of keys) {
		if (args[key] !== undefined && args[key] !== null && args[key] !== '') {
			result += '&' + key + '=' + args[key];
		}
	}
	return result.substr(1);
}

function getClientIp(req) {
	let address = (req.headers['x-forwarded-for'] ||
		req.connection.remoteAddress ||
		req.socket.remoteAddress ||
		req.connection.socket.remoteAddress) || '';
	const index = address.lastIndexOf(':');
	if (index !== -1) address = address.substr(index + 1);
	return address;
}

/* GET wechat page. */
router.get('/', function (req, res, next) {
	res.send('微信相关接口');
});

router.get('/unifiedorder', function (req, res) {
	const payInfo = {
		appid: 'wx9fa9422a2d9048e1',
		mch_id: '1411147102',
		openid: 'ob_0X0Q-9oBHzyNe4oxj69ssPT7U',
		out_trade_no: new Date().getTime(),
		total_fee: 1,
		body: '测试',
		notify_url: 'https://x1.51daoteng.com',
		spbill_create_ip: getClientIp(req),
	};
	const payKey = 'DuoGuanMofang123DuoGuanMofang123';

	unifiedorder(payKey, payInfo, function (err, response, body) {
		if (!err && response.statusCode === 200) {
			// console.log('success', body);
			let result = parseStringSync(body);
			if (result) {
				result = result.xml;
				for (const key in result) {
					if (!result.hasOwnProperty(key)) continue;
					if (result[key] instanceof Array)
						result[key] = result[key][0];
				}

				const nonceStr = randomString();
				const timeStamp = Math.floor(new Date().getTime() / 1000).toString();
				const packageStr = 'prepay_id=' + result.prepay_id;
				const sign = md5(raw1({
					appId: result.appid,
					timeStamp: timeStamp,
					nonceStr: nonceStr,
					package: packageStr,
					signType: 'MD5',
				}) + '&key=' + payKey);
				res.end(JSON.stringify({
					timeStamp: timeStamp,
					nonceStr: nonceStr,
					package: packageStr,
					signType: 'MD5',
					paySign: sign
				}));
			} else {
				res.end('支付失败');
			}

		} else {
			console.error('fail', err, response);
			res.end(err);
		}
		console.log('end...');
	});
});

module.exports = router;