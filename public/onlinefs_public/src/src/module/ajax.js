const DEBUG = true;

class Ajax {
	constructor(parameter) {
		this.parameter = parameter;
		this.parameter["json"] = parameter["json"] || true;
	}

	success(data) {
		if (DEBUG) console.log("Ajax success\n", data);
		try {
			if (typeof data != "object")
				if (this.parameter["json"]) data = JSON.parse(data);
		} catch (e) {
			console.error('WANG: Ajax BackData is not JSON', e);
		} finally {
			if (this.parameter['success']) this.parameter['success'](data.response || data, data);
		}

	}

	error(XML, textStatus, errorThrown) {
		if (DEBUG) console.error("Ajax error!!!\n", XML);
		if (this.parameter['error']) this.parameter['error'](XML, textStatus, errorThrown);
	}


	ajax() {
		var that = this;
		if (typeof this.parameter['data'] == "object")
			this.parameter['data'] = JSON.stringify(this.parameter['data']);

		if (DEBUG) console.log("发起 Ajax:", this.parameter['url'], "数据:" + this.parameter.data);
		AbortSignal.timeout ??= function timeout(ms) {
			const ctrl = new AbortController;
			setTimeout(() => ctrl.abort(), ms);
			return ctrl.signal;
		}

		fetch(encodeURI(this.parameter['url']), {
			method: this.parameter['type'] || "POST",
			body: ["GET", "HEAD"].includes((this.parameter['type'] ?? "GET").toUpperCase()) ? undefined : JSON.stringify({
				request: this.parameter['data']
			}), //具体实例化
			signal: AbortSignal.timeout(this.parameter['timeout'] || 8000),
			cache: parameter["cache"] ? "force-cache" : "no-cache" ?? "no-cache"
		}).then(res => {
			if (!res.ok) {
				that.error(null, res.statusText, new Error);
			} else {
				return res.text().then(text => {
					that.success(text);
				});
			}
		});
	}

	reset(newParameters) {
		for (let key in newParameters) {
			this.parameter[key] = newParameters[key];
		}
	}
}


export default {
	Ajax
}