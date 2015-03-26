(function (global, undefined) {
    if (global.RongIMClient) {
        return;
    }
    Number.prototype.getValue = function () {
        return this.valueOf();
    };
    var io = {}, messageIdHandler, func = function () {
        var script = document.createElement("script");
        io._TransportType = "websocket";
        if ("WebSocket" in global && "ArrayBuffer" in global && !global.WEB_SOCKET_FORCE_FLASH && !global.WEB_XHR_POLLING) {
            script.src = "http://res.websdk.rongcloud.cn/protobuf-0.1.min.js";
        } else if (!global.WEB_XHR_POLLING && (function () {
            if ('navigator' in global && 'plugins' in navigator && navigator.plugins['Shockwave Flash']) {
                return !!navigator.plugins['Shockwave Flash'].description;
            }
            if ('ActiveXObject' in global) {
                try {
                    return !!new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
                } catch (e) {
                }
            }
            return false;
        })()) {
            script.src = "http://res.websdk.rongcloud.cn/swfobject-0.1.min.js?v=3";
        } else {
            io._TransportType = "xhr-polling";
            script.src = "http://res.websdk.rongcloud.cn/xhrpolling.min.js";
        }
        document.getElementsByTagName("head")[0].appendChild(script);
        messageIdHandler = new function () {
            var messageId = 0, isXHR = io._TransportType === "xhr-polling", init = function () {
                messageId = +(io.util.cookieHelper.getCookie("msgId") || io.util.cookieHelper.setCookie("msgId", 0) || 0);
            };
            isXHR && init();
            this.messageIdPlus = function (x) {
                isXHR && init();
                if (messageId >= 65535) {
                    x.reconnect();
                    return false;
                }
                messageId++;
                isXHR && io.util.cookieHelper.setCookie("msgId", messageId);
                return messageId;
            };
            this.clearMessageId = function () {
                messageId = 0;
                isXHR && io.util.cookieHelper.setCookie("msgId", messageId);
            };
            this.getMessageId = function () {
                isXHR && init();
                return messageId;
            }
        };
    };
    if (document.readyState == "interactive" || document.readyState == "complete") {
        func();
    } else if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", function () {
            document.removeEventListener("DOMContentLoaded", arguments.callee, false);
            func();
        }, false)
    } else if (document.attachEvent) {
        document.attachEvent("onreadystatechange", function () {
            if (document.readyState === "interactive" || document.readyState === "complete") {
                document.detachEvent("onreadystatechange", arguments.callee);
                func()
            }
        })
    }
    var binaryHelper = global.RongBinaryHelper = {
        init: function (array) {
            for (var i = 0; i < array.length; i++) {
                array[i] *= 1;
                if (array[i] < 0) {
                    array[i] += 256
                }
            }
            return array
        },
        writeUTF: function (str, isGetBytes) {
            var back = [],
                byteSize = 0;
            for (var i = 0; i < str.length; i++) {
                var code = str.charCodeAt(i);
                if (code >= 0 && code <= 127) {
                    byteSize += 1;
                    back.push(code);
                } else if (code >= 128 && code <= 2047) {
                    byteSize += 2;
                    back.push((192 | (31 & (code >> 6))));
                    back.push((128 | (63 & code)))
                } else if (code >= 2048 && code <= 65535) {
                    byteSize += 3;
                    back.push((224 | (15 & (code >> 12))));
                    back.push((128 | (63 & (code >> 6))));
                    back.push((128 | (63 & code)))
                }
            }
            for (i = 0; i < back.length; i++) {
                if (back[i] > 255) {
                    back[i] &= 255
                }
            }
            if (isGetBytes) {
                return back
            }
            if (byteSize <= 255) {
                return [0, byteSize].concat(back);
            } else {
                return [byteSize >> 8, byteSize & 255].concat(back);
            }
        },
        readUTF: function (arr) {
            if (Object.prototype.toString.call(arr) == "[object String]") {
                return arr;
            }
            var UTF = "",
                _arr = this.init(arr);
            for (var i = 0; i < _arr.length; i++) {
                var one = _arr[i].toString(2),
                    v = one.match(/^1+?(?=0)/);
                if (v && one.length == 8) {
                    var bytesLength = v[0].length,
                        store = _arr[i].toString(2).slice(7 - bytesLength);
                    for (var st = 1; st < bytesLength; st++) {
                        store += _arr[st + i].toString(2).slice(2)
                    }
                    UTF += String.fromCharCode(parseInt(store, 2));
                    i += bytesLength - 1
                } else {
                    UTF += String.fromCharCode(_arr[i])
                }
            }
            return UTF
        },
        convertStream: function (x) {
            if (x instanceof RongIMStream) {
                return x
            } else {
                return new RongIMStream(x)
            }
        },
        toMQttString: function (str) {
            return this.writeUTF(str)
        }
    };
    var RongIMStream = function (arr) {
        var pool = binaryHelper.init(arr),
            self = this,
            check = function () {
                return self.position >= pool.length
            };
        this.position = 0;
        this.writen = 0;

        function baseRead(m, i, a) {
            var t = a ? a : [];
            for (var start = 0; start < i; start++) {
                t[start] = pool[m.position++]
            }
            return t
        }

        this.readInt = function () {
            if (check()) {
                return -1
            }
            var end = "";
            for (var i = 0; i < 4; i++) {
                end += pool[this.position++].toString(16)
            }
            return parseInt(end, 16);
        };
        this.readByte = function () {
            if (check()) {
                return -1
            }
            var val = pool[this.position++];
            if (val > 255) {
                val &= 255;
            }
            return val;
        };
        this.read = function (bytesArray) {
            if (check()) {
                return -1
            }
            if (bytesArray) {
                baseRead(this, bytesArray.length, bytesArray)
            } else {
                return this.readByte();
            }
        };
        this.readUTF = function () {
            var big = (this.readByte() << 8) | this.readByte();
            return binaryHelper.readUTF(pool.slice(this.position, this.position += big));
        };
        this.write = function (_byte) {
            var b = _byte;
            if (Object.prototype.toString.call(b).toLowerCase() == "[object array]") {
                [].push.apply(pool, b)
            } else {
                if (+b == b) {
                    if (b > 255) {
                        b &= 255;
                    }
                    pool.push(b);
                    this.writen++
                }
            }
            return b
        };
        this.writeChar = function (v) {
            if (+v != v) {
                throw new TypeError("writeChar:arguments type is error")
            }
            this.write((v >> 8) & 255);
            this.write(v & 255);
            this.writen += 2
        };
        this.writeUTF = function (str) {
            var val = binaryHelper.writeUTF(str);
            [].push.apply(pool, val);
            this.writen += val.length;
        };
        this.toComplements = function () {
            var _tPool = pool;
            for (var i = 0; i < _tPool.length; i++) {
                if (_tPool[i] > 128) {
                    _tPool[i] -= 256
                }
            }
            return _tPool
        };
        this.getBytesArray = function (isCom) {
            if (isCom) {
                return this.toComplements()
            }
            return pool
        }
    };
    var Qos = function (i) {
            var val = 0;
            if (i) {
                val = i
            }
            this.currentValue = function () {
                return val
            }
        },
        type = function (i) {
            var val = 0;
            if (i) {
                val = i
            }
            this.currentValue = function () {
                return val
            }
        },
        ConnectionState = function (i) {
            var val = 0;
            val = i;
            this.getValue = function () {
                return val
            }
        },
        DisconnectionStatus = function (i) {
            var val = i || 0;
            this.getValue = function () {
                return val
            }
        };
    Qos.valueOf = function (i) {
        return new Qos(i)
    };
    type.valueOf = function (i) {
        return new type(i)
    };

    function Message(type) {
        var _header, _headerCode, lengthSize = 0;
        if (type instanceof Header) {
            _header = type
        } else {
            _header = new Header(type, false, new Qos(0), false)
        }
        this.read = function (In, length) {
            this.readMessage(In, length)
        };
        this.write = function (Out) {
            var out = binaryHelper.convertStream(Out);
            _headerCode = this.getHeaderFlag();
            out.write(_headerCode);
            this.writeMessage(out);
            this.addEmpty(out);
            return out
        };
        this.getHeaderFlag = function () {
            return _header.encode();
        };
        this.getLengthSize = function () {
            return lengthSize
        };
        this.toBytes = function () {
            return this.write([]).getBytesArray()
        };
        this.setRetained = function (retain) {
            _header.retain = retain
        };
        this.isRetained = function () {
            return _header.retain
        };
        this.setQos = function (qos) {
            _header.qos = qos
        };
        this.getQos = function () {
            return _header.qos
        };
        this.setDup = function (dup) {
            _header.dup = dup
        };
        this.isDup = function () {
            return _header.dup
        };
        this.getType = function () {
            return _header.type
        };
        this.messageLength = function () {
            return 0
        };
        this.writeMessage = function (out) {
        };
        this.readMessage = function (In) {
        };
        this.addEmpty = function (out) {
        };
        this.init = function (args) {
            var temp, nana;
            for (nana in args) {
                if (!args.hasOwnProperty(nana))
                    continue;
                temp = nana.charCodeAt(0);
                if (temp > 0x61) {
                    temp -= 0x20
                }
                var valName = "set" + String.fromCharCode(temp) + nana.slice(1);
                if (valName in this) {
                    this[valName](args[nana])
                }
            }
        };
    }

    Message._name = "Message";

    function Header(_type, _retain, _qos, _dup) {
        this.type = null;
        this.retain = false;
        this.qos = new Qos(1);
        this.dup = false;
        if (_type && +_type == _type && arguments.length == 1) {
            this.retain = (_type & 1) > 0;
            this.qos = Qos.valueOf((_type & 6) >> 1);
            this.dup = (_type & 8) > 0;
            this.type = type.valueOf((_type >> 4) & 15);
        } else {
            this.type = _type;
            this.retain = _retain;
            this.qos = _qos;
            this.dup = _dup;
        }
        this.getType = function () {
            return this.type
        };
        this.encode = function () {
            var _byte = (this.type.currentValue() << 4);
            _byte |= this.retain ? 1 : 0;
            _byte |= this.qos.currentValue() << 1;
            _byte |= this.dup ? 8 : 0;
            return _byte
        };
        this.toString = function () {
            return "Header [type=" + this.type.currentValue() + ",retain=" + this.retain + ",qos=" + this.qos.currentValue() + ",dup=" + this.dup + "]"
        }
    }

    function ConnectMessage() {
        var CONNECT_HEADER_SIZE = 12,
            protocolId = "RCloud",
            protocolVersion = 3,
            clientId, keepAlive, appId, token, cleanSession, willTopic, will, willQos, retainWill, hasAppId, hasToken, hasWill;
        switch (arguments.length) {
            case 0:
                Message.call(this, new type(1));
                break;
            case 1:
                Message.call(this, arguments[0]);
                break;
            case 3:
                Message.call(this, new type(1));
                if (!arguments[0] || arguments.length > 64) {
                    throw new TypeError("ConnectMessage:Client Id cannot be null and must be at most 64 characters long: " + arguments[0])
                }
                clientId = arguments[0];
                cleanSession = arguments[1];
                keepAlive = arguments[2];
                break
        }
        this.messageLength = function () {
            var payloadSize = binaryHelper.toMQttString(clientId).length;
            payloadSize += binaryHelper.toMQttString(willTopic).length;
            payloadSize += binaryHelper.toMQttString(will).length;
            payloadSize += binaryHelper.toMQttString(appId).length;
            payloadSize += binaryHelper.toMQttString(token).length;
            return payloadSize + CONNECT_HEADER_SIZE
        };
        this.readMessage = function (In) {
            var stream = binaryHelper.convertStream(In);
            protocolId = stream.readUTF();
            protocolVersion = stream.readByte();
            var cFlags = stream.readByte();
            hasAppId = (cFlags & 128) > 0;
            hasToken = (cFlags & 64) > 0;
            retainWill = (cFlags & 32) > 0;
            willQos = Qos.valueOf(cFlags >> 3 & 3).currentValue();
            hasWill = (cFlags & 4) > 0;
            cleanSession = (cFlags & 32) > 0;
            keepAlive = stream.read() * 256 + stream.read();
            clientId = stream.readUTF();
            if (hasWill) {
                willTopic = stream.readUTF();
                will = stream.readUTF()
            }
            if (hasAppId) {
                try {
                    appId = stream.readUTF()
                } catch (ex) {
                }
            }
            if (hasToken) {
                try {
                    token = stream.readUTF()
                } catch (ex) {
                }
            }
            return stream
        };
        this.writeMessage = function (out) {
            var stream = binaryHelper.convertStream(out);
            stream.writeUTF(protocolId);
            stream.write(protocolVersion);
            var flags = cleanSession ? 2 : 0;
            flags |= hasWill ? 4 : 0;
            flags |= willQos ? willQos >> 3 : 0;
            flags |= retainWill ? 32 : 0;
            flags |= hasToken ? 64 : 0;
            flags |= hasAppId ? 128 : 0;
            stream.write(flags);
            stream.writeChar(keepAlive);
            stream.writeUTF(clientId);
            if (hasWill) {
                stream.writeUTF(willTopic);
                stream.writeUTF(will)
            }
            if (hasAppId) {
                stream.writeUTF(appId)
            }
            if (hasToken) {
                stream.writeUTF(token)
            }
            return stream
        };

    }

    ConnectMessage._name = "ConnectMessage";
    ConnectMessage.prototype = new Message();
    ConnectMessage.prototype.constructor = ConnectMessage;

    function ConnAckMessage() {
        var status, userId, MESSAGE_LENGTH = 2;
        switch (arguments.length) {
            case 0:
                Message.call(this, new type(2));
                break;
            case 1:
                if (arguments[0] instanceof Header) {
                    Message.call(this, arguments[0])
                } else {
                    if (arguments[0] instanceof ConnectionState) {
                        Message.call(this, new type(2));
                        if (arguments[0] == null) {
                            throw new TypeError("ConnAckMessage:The status of ConnAskMessage can't be null")
                        }
                        status = arguments[0]
                    }
                }
        }
        this.messageLength = function () {
            var length = MESSAGE_LENGTH;
            if (userId) {
                length += binaryHelper.toMQttString(userId).length
            }
            return length
        };
        this.readMessage = function (In, msglength) {
            var stream = binaryHelper.convertStream(In);
            stream.read();
            var result = +stream.read();
            if (result >= 0 && result <= 9) {
                this.setStatus(result);
            } else {
                throw new RangeError("Unsupported CONNACK code:" + result)
            }
            if (msglength > MESSAGE_LENGTH) {
                this.setUserId(stream.readUTF())
            }
        };
        this.writeMessage = function (out) {
            var stream = binaryHelper.convertStream(out);
            stream.write(128);
            switch (+status.getValue()) {
                case 0:
                case 1:
                case 2:
                case 5:
                case 6:
                    stream.write(+status.getValue());
                    break;
                case 3:
                case 4:
                    stream.write(3);
                    break;
                default:
                    throw new RangeError("Unsupported CONNACK code:" + status.valueOf());
            }
            if (userId) {
                stream.writeUTF(userId)
            }
            return stream
        };
        this.getStatus = function () {
            return status.valueOf()
        };
        this.setStatus = function (x) {
            if (+x == x) {
                status = new ConnectionState(x);
            } else {
                status = x;
            }
        };
        this.setUserId = function (_userId) {
            userId = _userId
        };
        this.getUserId = function () {
            return userId
        };
    }

    ConnAckMessage._name = "ConnAckMessage";
    ConnAckMessage.prototype = new Message();
    ConnAckMessage.prototype.constructor = ConnAckMessage;

    function DisconnectMessage(one) {
        var status;
        this.MESSAGE_LENGTH = 2;
        if (one instanceof Header) {
            Message.call(this, one)
        } else {
            Message.call(this, new type(14));
            if (one instanceof DisconnectionStatus) {
                status = one
            }
        }
        this.messageLength = function () {
            return this.MESSAGE_LENGTH
        };
        this.readMessage = function (In) {
            var _in = binaryHelper.convertStream(In);
            _in.read();
            var result = +_in.read();
            if (result >= 0 && result <= 5) {
                this.setStatus(result);
            } else {
                throw new RangeError("Unsupported CONNACK code:" + result)
            }
        };
        this.writeMessage = function (Out) {
            var out = binaryHelper.convertStream(Out);
            out.write(0);
            if (+status.getValue() >= 1 && +status.getValue() <= 3) {
                out.write((+status.getValue()) - 1);
            } else {
                throw new RangeError("Unsupported CONNACK code:" + status)
            }
        };
        this.setStatus = function (x) {
            if (+x == x) {
                status = new DisconnectionStatus(x);
            } else {
                status = x;
            }
        };
        this.getStatus = function () {
            return status
        };
    }

    DisconnectMessage._name = "DisconnectMessage";
    DisconnectMessage.prototype = new Message();
    DisconnectMessage.prototype.constructor = DisconnectMessage;

    function PingReqMessage(header) {
        if (header && header instanceof Header) {
            Message.call(this, header)
        } else {
            Message.call(this, new type(12))
        }
        this.addEmpty = function (out) {
            var _out = binaryHelper.convertStream(out);
            _out.write(0)
        }
    }

    PingReqMessage._name = "PingReqMessage";
    PingReqMessage.prototype = new Message();
    PingReqMessage.prototype.constructor = PingReqMessage;

    function PingRespMessage(header) {
        if (header && header instanceof Header) {
            Message.call(this, header)
        } else {
            Message.call(this, new type(13))
        }
    }

    PingRespMessage._name = "PingRespMessage";
    PingRespMessage.prototype = new Message();
    PingRespMessage.prototype.constructor = PingRespMessage;

    function RetryableMessage(argu) {
        var messageId;
        Message.call(this, argu);
        this.messageLength = function () {
            return 2
        };
        this.writeMessage = function (Out) {
            var out = binaryHelper.convertStream(Out),
                Id = this.getMessageId(),
                lsb = Id & 255,
                msb = (Id & 65280) >> 8;
            out.write(msb);
            out.write(lsb);
            return out
        };
        this.readMessage = function (In) {
            var _in = binaryHelper.convertStream(In),
                msgId = _in.read() * 256 + _in.read();
            this.setMessageId(parseInt(msgId, 10));
        };
        this.setMessageId = function (_messageId) {
            messageId = _messageId
        };
        this.getMessageId = function () {
            return messageId
        }
    }

    RetryableMessage._name = "RetryableMessage";
    RetryableMessage.prototype = new Message();
    RetryableMessage.prototype.constructor = RetryableMessage;

    function PubAckMessage(args) {
        var status, msgLen = 2,
            date = 0;
        if (args instanceof Header) {
            RetryableMessage.call(this, args)
        } else {
            RetryableMessage.call(this, new type(4));
            this.setMessageId(args)
        }
        this.messageLength = function () {
            return msgLen
        };
        this.writeMessage = function (Out) {
            var out = binaryHelper.convertStream(Out);
            PubAckMessage.prototype.writeMessage.call(this, out)
        };
        this.readMessage = function (In) {
            var _in = binaryHelper.convertStream(In);
            PubAckMessage.prototype.readMessage.call(this, _in);
            date = _in.readInt();
            status = _in.read() * 256 + _in.read()
        };
        this.setStatus = function (x) {
            status = x;
        };
        this.getStatus = function () {
            return status
        };
        this.getDate = function () {
            return date
        };
    }

    PubAckMessage._name = "PubAckMessage";
    PubAckMessage.prototype = new RetryableMessage();
    PubAckMessage.prototype.constructor = PubAckMessage;

    function PublishMessage(one, two, three) {
        var topic, data, targetId, date;
        if (arguments.length == 1 && one instanceof Header) {
            RetryableMessage.call(this, one)
        } else {
            if (arguments.length == 3) {
                RetryableMessage.call(this, new type(3));
                topic = one;
                targetId = three;
                data = typeof two == "string" ? binaryHelper.toMQttString(two) : two;
            }
        }
        this.messageLength = function () {
            var length = 10;
            length += binaryHelper.toMQttString(topic).length;
            length += binaryHelper.toMQttString(targetId).length;
            length += data.length;
            return length
        };
        this.writeMessage = function (Out) {
            var out = binaryHelper.convertStream(Out);
            out.writeUTF(topic);
            out.writeUTF(targetId);
            PublishMessage.prototype.writeMessage.call(this, out);
            out.write(data)
        };
        this.readMessage = function (In, msgLength) {
            var pos = 6,
                _in = binaryHelper.convertStream(In);
            date = _in.readInt();
            topic = _in.readUTF();
            pos += binaryHelper.toMQttString(topic).length;
            PublishMessage.prototype.readMessage.call(this, _in, msgLength);
            data = new Array(msgLength - pos);
            _in.read(data)
        };
        this.setTopic = function (x) {
            topic = x;
        };
        this.setData = function (x) {
            data = x;
        };
        this.setTargetId = function (x) {
            targetId = x;
        };
        this.setDate = function (x) {
            date = x;
        };
        this.setData = function (x) {
            data = x;
        };
        this.getTopic = function () {
            return topic
        };
        this.getData = function () {
            return data
        };
        this.getTargetId = function () {
            return targetId
        };
        this.getDate = function () {
            return date
        }
    }

    PublishMessage._name = "PublishMessage";
    PublishMessage.prototype = new RetryableMessage();
    PublishMessage.prototype.constructor = PublishMessage;

    function QueryMessage(one, two, three) {
        var topic, data, targetId;
        if (one instanceof Header) {
            RetryableMessage.call(this, one)
        } else {
            if (arguments.length == 3) {
                RetryableMessage.call(this, new type(5));
                data = typeof two == "string" ? binaryHelper.toMQttString(two) : two;
                topic = one;
                targetId = three;
            }
        }
        this.messageLength = function () {
            var length = 0;
            length += binaryHelper.toMQttString(topic).length;
            length += binaryHelper.toMQttString(targetId).length;
            length += 2;
            length += data.length;
            return length
        };
        this.writeMessage = function (Out) {
            var out = binaryHelper.convertStream(Out);
            out.writeUTF(topic);
            out.writeUTF(targetId);
            QueryMessage.prototype.writeMessage.call(this, out);
            out.write(data)
        };
        this.readMessage = function (In, msgLength) {
            var pos = 0,
                _in = binaryHelper.convertStream(In);
            topic = _in.readUTF();
            targetId = _in.readUTF();
            pos += binaryHelper.toMQttString(topic).length;
            pos += binaryHelper.toMQttString(targetId).length;
            QueryMessage.prototype.readMessage.call(this, _in, msgLength);
            pos += 2;
            data = new Array(msgLength - pos);
            _in.read(data)
        };
        this.setTopic = function (x) {
            topic = x;
        };
        this.setData = function (x) {
            data = x;
        };
        this.setTargetId = function (x) {
            targetId = x;
        };
        this.getTopic = function () {
            return topic
        };
        this.getData = function () {
            return data
        };
        this.getTargetId = function () {
            return targetId
        };
    }

    QueryMessage._name = "QueryMessage";
    QueryMessage.prototype = new RetryableMessage();
    QueryMessage.prototype.constructor = QueryMessage;

    function QueryConMessage(messageId) {
        if (messageId instanceof Header) {
            RetryableMessage.call(this, messageId)
        } else {
            RetryableMessage.call(this, new type(7));
            this.setMessageId(messageId)
        }
    }

    QueryConMessage._name = "QueryConMessage";
    QueryConMessage.prototype = new RetryableMessage();
    QueryConMessage.prototype.constructor = QueryConMessage;

    function QueryAckMessage(header) {
        var data, status, date;
        RetryableMessage.call(this, header);
        this.readMessage = function (In, msgLength) {
            var _in = binaryHelper.convertStream(In);
            QueryAckMessage.prototype.readMessage.call(this, _in);
            date = _in.readInt();
            status = _in.read() * 256 + _in.read();
            if (msgLength > 0) {
                data = new Array(msgLength - 8);
                _in.read(data)
            }
        };
        this.getStatus = function () {
            return status
        };
        this.getDate = function () {
            return date
        };
        this.setDate = function (x) {
            date = x;
        };
        this.setStatus = function (x) {
            status = x;
        };
        this.setData = function (x) {
            data = x;
        };
        this.getData = function () {
            return data
        };
    }

    QueryAckMessage._name = "QueryAckMessage";
    QueryAckMessage.prototype = new RetryableMessage();
    QueryAckMessage.prototype.constructor = QueryAckMessage;

    function MessageOutputStream(_out) {
        var out = binaryHelper.convertStream(_out);
        this.writeMessage = function (msg) {
            if (msg instanceof Message) {
                msg.write(out)
            }
        }
    }

    function MessageInputStream(In, isPolling) {
        var flags, header, msg = null;
        if (!isPolling) {
            var _in = binaryHelper.convertStream(In);
            flags = _in.readByte();
        } else {
            flags = In.headerCode;
        }
        header = new Header(flags);
        this.readMessage = function () {
            switch (+header.getType().currentValue()) {
                case 2:
                    msg = new ConnAckMessage(header);
                    break;
                case 3:
                    msg = new PublishMessage(header);
                    break;
                case 4:
                    msg = new PubAckMessage(header);
                    break;
                case 5:
                    msg = new QueryMessage(header);
                    break;
                case 6:
                    msg = new QueryAckMessage(header);
                    break;
                case 7:
                    msg = new QueryConMessage(header);
                    break;
                case 9:
                case 11:
                case 13:
                    msg = new PingRespMessage(header);
                    break;
                case 1:
                    msg = new ConnectMessage(header);
                    break;
                case 8:
                case 10:
                case 12:
                    msg = new PingReqMessage(header);
                    break;
                case 14:
                    msg = new DisconnectMessage(header);
                    break;
                default:
                    throw new RangeError("No support for deserializing " + header.getType().currentValue() + " messages")
            }
            if (isPolling) {
                msg.init(In);
            } else {
                msg.read(_in, In.length - 1);
            }
            return msg
        }
    }

    io.connect = function (token, args) {
        if (this.getInstance) {
            return this
        } else {
            var instance = new this.createServer();
            this.getInstance = function () {
                return instance
            };
            instance.connect(token, args);
            return instance
        }
    };
    (function () {
        var _pageLoaded = false;
        io.util = {
            load: function (fn) {
                if (document.readyState == "complete" || _pageLoaded) {
                    return fn()
                }
                if (global.attachEvent) {
                    global.attachEvent("onload", fn)
                } else {
                    global.addEventListener("load", fn, false)
                }
            },
            inherit: function (ctor, superCtor) {
                for (var i in superCtor.prototype) {
                    ctor.prototype[i] = superCtor.prototype[i]
                }
            },
            indexOf: function (arr, item, from) {
                for (var l = arr.length, i = (from < 0) ? Math.max(0, +from) : from || 0; i < l; i++) {
                    if (arr[i] == item) {
                        return i
                    }
                }
                return -1
            },
            isArray: function (obj) {
                return Object.prototype.toString.call(obj) == "[object Array]"
            },
            forEach: function (arr, func) {
                if ([].forEach) {
                    return [].forEach.call(arr, func)
                } else {
                    for (var i = 0; i < arr.length; i++) {
                        func.call(arr, arr[i], i, arr)
                    }
                }
            },
            merge: function (target, additional) {
                for (var i in additional) {
                    if (additional.hasOwnProperty(i)) {
                        target[i] = additional[i]
                    }
                }
            },
            arrayFrom: function (typedarray) {
                if (Object.prototype.toString.call(typedarray) == "[object ArrayBuffer]") {
                    var arr = new Int8Array(typedarray);
                    return [].slice.call(arr)
                }
                return typedarray;
            },
            filter: function (array, func) {
                if ([].filter) {
                    return array.filter(func)
                } else {
                    var temp = [];
                    for (var i = 0; i < array.length; i++) {
                        if (func(array[i], i, array)) {
                            temp.push(array[i])
                        }
                    }
                    return temp
                }
            },
            remove: function (array, func) {
                for (var i = 0; i < array.length; i++) {
                    if (func(array[i])) {
                        return array.splice(i, 1)[0]
                    }
                }
                return null
            },
            int64ToTimestamp: function (obj, isDate) {
                if (/^\d+$/.test(obj)) {
                    return obj;
                }
                var low = obj.low;
                if (low < 0) {
                    low += 0xffffffff
                }
                low = low.toString(16);
                var timestamp = parseInt(obj.high.toString(16) + "00000000".replace(new RegExp('0{' + low.length + '}$'), low), 16);
                if (isDate) {
                    return new Date(timestamp)
                }
                return timestamp;
            },
            cookieHelper: {
                getCookie: function (name) {
                    var arr = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)(;|$)"));
                    if (arr != null) {
                        return (arr[2]);
                    }
                    return null;
                },
                setCookie: function (name, value, sec) {
                    var exp = new Date();
                    if (sec) {
                        exp.setTime(exp.getTime() + sec * 1000);
                    } else {
                        exp.setTime(exp.getTime() + 30 * 24 * 3600 * 1000);
                    }
                    document.cookie = name + "=" + escape(value) + ";path=/;expires=" + exp.toGMTString();
                },
                deleteCookie: function (name) {
                    if (this.getCookie(name)) {
                        document.cookie = name + "=;path=/;expires=Thu, 01-Jan-1970 00:00:01 GMT";
                    }
                },
                removeAllCookie: function () {
                    var keys = document.cookie.match(/[^ =;]+(?=\=)/g);
                    if (keys) {
                        for (var i = keys.length; i--;)
                            document.cookie = keys[i] + '=0;expires=' + new Date(0).toUTCString()
                    }

                }
            }
        };
        io.util.ios = /iphone|ipad/i.test(navigator.userAgent);
        io.util.android = /android/i.test(navigator.userAgent);
        io.util.opera = /opera/i.test(navigator.userAgent);
        io.util.load(function () {
            _pageLoaded = true;
            if (!global.JSON) {
                global.JSON = {
                    parse: function (sJSON) {
                        return eval('(' + sJSON + ')');
                    },
                    stringify: (function () {
                        var toString = Object.prototype.toString;
                        var isArray = Array.isArray || function (a) {
                            return toString.call(a) === '[object Array]';
                        };
                        var escMap = {'"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t'};
                        var escFunc = function (m) {
                            return escMap[m] || '\\u' + (m.charCodeAt(0) + 0x10000).toString(16).substr(1);
                        };
                        var escRE = /[\\"\u0000-\u001F\u2028\u2029]/g;
                        return function stringify(value) {
                            if (value == null) {
                                return 'null';
                            } else if (typeof value === 'number') {
                                return isFinite(value) ? value.toString() : 'null';
                            } else if (typeof value === 'boolean') {
                                return value.toString();
                            } else if (typeof value === 'object') {
                                if (typeof value.toJSON === 'function') {
                                    return stringify(value.toJSON());
                                } else if (isArray(value)) {
                                    var res = '[';
                                    for (var i = 0; i < value.length; i++)
                                        res += (i ? ', ' : '') + stringify(value[i]);
                                    return res + ']';
                                } else if (toString.call(value) === '[object Object]') {
                                    var tmp = [];
                                    for (var k in value) {
                                        if (value.hasOwnProperty(k))
                                            tmp.push(stringify(k) + ': ' + stringify(value[k]));
                                    }
                                    return '{' + tmp.join(', ') + '}';
                                }
                            }
                            return '"' + value.toString().replace(escRE, escFunc) + '"';
                        };
                    })()
                };
            }
        });
    })();
    (function () {
        var Transport = io.Transport = function (base, options) {
            this.base = base;
            this.options = {
                timeout: 30000
            };
            io.util.merge(this.options, options)
        };
        Transport.prototype.send = function () {
            throw new ReferenceError("No rewrite send() method")
        };
        Transport.prototype.connect = function () {
            throw new ReferenceError("No rewrite connect() method")
        };
        Transport.prototype.disconnect = function () {
            throw new ReferenceError("No rewrite disconnect() method")
        };
        Transport.prototype._encode = function (msg) {
            var part = [];
            io.util.forEach(msg, function (x) {
                var str = "?messageid=" + x.getMessageId() + "&header=" + x.getHeaderFlag() + "&sessionid=" + io.util.cookieHelper.getCookie(Client.Endpoint.userId + "sId");
                if (!/(PubAckMessage|QueryConMessage)/.test(x.constructor._name)) {
                    str += "&topic=" + x.getTopic() + "&targetid=" + (x.getTargetId() || "");
                }
                part.push({
                    url: str,
                    data: "getData" in x ? x.getData() : ""
                });
            });
            return part;
        };
        Transport.prototype._decode = function (data) {
            if (!data) {
                return;
            }
            if (io.util.isArray(data)) {
                this._onMessage(new MessageInputStream(data).readMessage());
            } else if (Object.prototype.toString.call(data) == "[object ArrayBuffer]") {
                this._onMessage(new MessageInputStream(io.util.arrayFrom(data)).readMessage());
            }
        };
        Transport.prototype._onData = function (data, header) {
            if (!data) {
                return;
            }
            if (header) {
                io.util.cookieHelper.getCookie(Client.Endpoint.userId + "sId") || io.util.cookieHelper.setCookie(Client.Endpoint.userId + "sId", header);
            }
            var self = this,
                val = JSON.parse(data);
            if (!io.util.isArray(val)) {
                val = [val];
            }
            io.util.forEach(val, function (x) {
                self._onMessage(new MessageInputStream(x, true).readMessage());
            });
        };
        Transport.prototype._onMessage = function (message) {
            this.base._onMessage(message)
        };
        Transport.prototype._onConnect = function () {
            this.connected = true;
            this.connecting = false;
            this.base._onConnect()
        };
        Transport.prototype._onDisconnect = function () {
            this.connecting = false;
            this.connected = false;
            this.base._onDisconnect()
        };
    })();
    (function () {
        var WS = io.Transport.websocket = function () {
            io.Transport.apply(this, arguments)
        };
        io.util.inherit(WS, io.Transport);
        WS.prototype.type = "websocket";
        WS.prototype.connect = function (url) {
            var self = this;
            this.socket = new WebSocket("ws://" + url);
            this.socket.binaryType = "arraybuffer";
            this.socket.onopen = function () {
                self._onConnect();
            };
            this.socket.onmessage = function (ev) {
                if (typeof ev.data == "string") {
                    self._decode(ev.data.split(","))
                } else {
                    self._decode(ev.data)
                }
            };
            this.socket.onclose = function () {
                console.log("closed");
                self._onClose()
            };
            this.socket.onerror = function () {
                if (bridge._client && bridge._client.reconnectObj.onError) {
                    bridge._client.reconnectObj.onError(RongIMClient.ConnectCallback.ErrorCode.setValue(2));
                    delete bridge._client.reconnectObj.onError;
                } else {
                    throw new ReferenceError("network is unavailable or unknown error");
                }
            };
            return this
        };
        WS.prototype.send = function (data) {
            var stream = new RongIMStream([]),
                msg = new MessageOutputStream(stream);
            msg.writeMessage(data);
            var val = stream.getBytesArray(true);
            if (this.socket.readyState == 1) {
                if (global.Int8Array && !global.WEB_SOCKET_FORCE_FLASH) {
                    var binary = new Int8Array(val);
                    this.socket.send(binary.buffer)
                } else {
                    this.socket.send(val + "")
                }
            }
            return this
        };
        WS.prototype.disconnect = function () {
            if (this.socket) {
                this.socket.close()
            }
            return this
        };
        WS.prototype._onClose = function () {
            this._onDisconnect();
            return this
        };
        WS.check = function () {
            return "WebSocket" in global && WebSocket.prototype && WebSocket.prototype.send && typeof WebSocket !== "undefined"
        };
        WS.XDomainCheck = function () {
            return true;
        }
    })();
    (function () {
        var empty = new Function,
            XMLHttpRequestCORS = (function () {
                if (!('XMLHttpRequest' in global))
                    return false;
                var a = new XMLHttpRequest();
                return a.withCredentials != undefined;
            })(),
            request = function () {
                if ('XDomainRequest' in global)
                    return new XDomainRequest();
                if ('XMLHttpRequest' in global && XMLHttpRequestCORS)
                    return new XMLHttpRequest();
                return false;
            },
            XHR = io.Transport.XHR = function () {
                io.Transport.apply(this, arguments);
                this._sendBuffer = [];
            };
        io.util.inherit(XHR, io.Transport);
        XHR.prototype.connect = function (url) {
            var sid = io.util.cookieHelper.getCookie(Client.Endpoint.userId + "sId"), _that = this;
            if (sid) {
                io.getInstance().currentURL = url;
                setTimeout(function () {
                    _that.onopen("{\"status\":0,\"userId\":\"" + Client.Endpoint.userId + "\",\"headerCode\":32,\"messageId\":0,\"sessionid\":\"" + sid + "\"}");
                    _that._onConnect();
                }, 500);
                return this;
            }
            this._get(url);
            return this;
        };
        XHR.prototype._checkSend = function () {
            if (!this._posting && this._sendBuffer.length) {
                var encoded = this._encode(this._sendBuffer);
                this._sendBuffer = [];
                var self = this;
                io.util.forEach(encoded, function (x) {
                    setTimeout(function () {
                        self._send(x);
                    }, 0);
                });
            }
        };
        XHR.prototype.send = function (data) {
            this._sendBuffer.push(data);
            this._checkSend();
            return this;
        };
        XHR.prototype._send = function (data) {
            var self = this;
            this._posting = true;
            this._sendXhr = this._request(Client.Endpoint.host + "/websocket" + data.url, 'POST');
            if ("onload" in this._sendXhr) {
                this._sendXhr.onload = function () {
                    this.onload = empty;
                    self._posting = false;
                    self._onData(this.responseText);
                    self._checkSend();
                };
                this._sendXhr.onerror = function () {
                    this.onerror = empty;
                    self._posting = false;
                    io.util.cookieHelper.deleteCookie(Client.Endpoint.userId + "sId");
                    io.getInstance().reconnect();
                };
            } else {
                this._sendXhr.onreadystatechange = function () {
                    if (this.readyState == 4) {
                        this.onreadystatechange = empty;
                        self._posting = false;
                        if (/^(202|200)$/.test(this.status)) {
                            self._onData(this.responseText);
                            self._checkSend();
                        } else if (this.status == 400) {
                            io.util.cookieHelper.deleteCookie(Client.Endpoint.userId + "sId");
                            io.getInstance().reconnect();
                        } else {
                            self._onDisconnect();
                        }
                    }
                };
            }

            this._sendXhr.send(JSON.stringify(data.data));
        };
        XHR.prototype.disconnect = function () {
            this._onDisconnect();
            return this;
        };
        XHR.prototype._onDisconnect = function () {
            if (this._xhr) {
                this._xhr.onreadystatechange = this._xhr.onload = empty;
                this._xhr.abort();
                this._xhr = null;
            }
            if (this._sendXhr) {
                this._sendXhr.onreadystatechange = this._sendXhr.onload = empty;
                this._sendXhr.abort();
                this._sendXhr = null;
            }
            this._sendBuffer = [];
            io.Transport.prototype._onDisconnect.call(this);
        };
        XHR.prototype._request = function (url, method, multipart) {
            var req = request();
            if (multipart)
                req.multipart = true;
            req.open(method || 'GET', "http://" + url);
            if (method == 'POST' && 'setRequestHeader' in req) {
                req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded; charset=utf-8');
            }
            return req;
        };
        XHR.check = function () {
            try {
                if (request())
                    return true;
            } catch (e) {
            }
            return false;
        };
        XHR.XDomainCheck = function () {
            return XHR.check();
        };
        XHR.request = request;
    })();
    (function () {
        var empty = new Function(),
            XHRPolling = io.Transport['xhr-polling'] = function () {
                io.Transport.XHR.apply(this, arguments);
            };
        io.util.inherit(XHRPolling, io.Transport.XHR);
        XHRPolling.prototype.type = 'xhr-polling';
        XHRPolling.prototype.connect = function (x) {
            if (io.util.ios || io.util.android) {
                var self = this;
                io.util.load(function () {
                    setTimeout(function () {
                        io.Transport.XHR.prototype.connect.call(self, x);
                    }, 10);
                });
            } else {
                io.Transport.XHR.prototype.connect.call(this, x);
            }
        };
        XHRPolling.prototype.onopen = function (a, b) {
            var msgId = messageIdHandler.messageIdPlus(this);
            if (!msgId) {
                return;
            }
            if (a == "lost params") {
                io.util.cookieHelper.deleteCookie(Client.Endpoint.userId + "sId");
                io.getInstance().reconnect();
                return;
            }
            this._onData(a, b);
            if (/"headerCode":-32,/.test(a)) {
                return;
            }
            this._get(Client.Endpoint.host + "/pullmsg.js?topic=pullMsg&messageid=" + msgId + "&header=82&sessionid=" + io.util.cookieHelper.getCookie(Client.Endpoint.userId + "sId"), "{\"ispolling\":false,\"syncTime\":0}");
        };
        XHRPolling.prototype._get = function (symbol, arg) {
            var self = this;
            this._xhr = this._request(symbol, 'POST');
            if ("onload" in this._xhr) {
                this._xhr.onload = function () {
                    this.onload = empty;
                    var txt = this.responseText.match(/"sessionid":"\S+?(?=")/);
                    self.onopen(this.responseText, txt ? txt[0].slice(13) : void 0);
                    arg || self._onConnect();
                };
                this._xhr.onerror = function () {
                    self._onDisconnect();
                }
            } else {
                this._xhr.onreadystatechange = function () {
                    if (this.readyState == 4) {
                        this.onreadystatechange = empty;
                        if (/^(202|200)$/.test(this.status)) {
                            var txt = this.responseText.match(/"sessionid":"\S+?(?=")/);
                            self.onopen(this.responseText, txt ? txt[0].slice(13) : void 0);
                            arg || self._onConnect();
                        } else if (this.status == 400) {
                            io.util.cookieHelper.deleteCookie(Client.Endpoint.userId + "sId");
                            io.getInstance().reconnect();
                        } else {
                            self._onDisconnect();
                        }
                    }
                };
            }


            this._xhr.send(arg);
        };
        XHRPolling.check = function () {
            return io.Transport.XHR.check();
        };
        XHRPolling.XDomainCheck = function () {
            return io.Transport.XHR.XDomainCheck();
        };
    })();
    (function () {
        var Socket = io.createServer = function () {
            if (io.getInstance) {
                return io.getInstance()
            }
            this.options = {
                token: "",
                transports: ["websocket", "xhr-polling"]
            };
            this.connected = false;
            this.connecting = false;
            this._events = {};
            this.currentURL = "";
            this.transport = this.getTransport(io._TransportType);
            if (this.transport === null) {
                throw new Error("the channel was not supported")
            }
        };
        Socket.prototype.getTransport = function (override) {
            var i = 0, transport = override || this.options.transports[i];
            if (io.Transport[transport] && io.Transport[transport].check() && io.Transport[transport].XDomainCheck()) {
                return new io.Transport[transport](this, {})
            }
            return null;
        };
        Socket.prototype.connect = function (url, cb) {
            if (this.transport && arguments.length == 2) {
                if (url) {
                    this.on("connect", cb || function () {
                    })
                }
                if (this.connecting || this.connected) {
                    this.disconnect()
                }
                this.connecting = true;
                if (url) {
                    this.currentURL = url
                }
                this.transport.connect(this.currentURL); //是否重连
            }
            return this
        };
        Socket.prototype.send = function (data) {
            if (!this.transport || !this.connected) {
                return this._queue(data)
            }
            this.transport.send(data)
        };
        Socket.prototype.disconnect = function (callback) {
            if (callback) {
                this.fire("StatusChanged", callback)
            }
            this.transport.disconnect();
            return this;
        };
        Socket.prototype.reconnect = function () {
            if (this.currentURL) {
                return this.connect(null, null);
            } else {
                throw new ReferenceError("reconnect:no have URL");
            }
        };
        Socket.prototype.fire = function (name, args) {
            if (name in this._events) {
                for (var i = 0, ii = this._events[name].length; i < ii; i++) {
                    this._events[name][i](args);
                }
            }
            return this
        };
        Socket.prototype.removeEvent = function (name, fn) {
            if (name in this._events) {
                for (var a = 0, l = this._events[name].length; a < l; a++) {
                    if (this._events[name][a] == fn) {
                        this._events[name].splice(a, 1)
                    }
                }
            }
            return this
        };
        Socket.prototype._queue = function (message) {
            if (!("_queueStack" in this)) {
                this._queueStack = []
            }
            this._queueStack.push(message);
            return this
        };
        Socket.prototype._doQueue = function () {
            if (!("_queueStack" in this) || !this._queueStack.length) {
                return this
            }
            for (var i = 0; i < this._queueStack.length; i++) {
                this.transport.send(this._queueStack[i])
            }
            this._queueStack = [];
            return this
        };
        Socket.prototype._onConnect = function () {
            this.connected = true;
            this.connecting = false;
            this.fire("connect");
        };
        Socket.prototype._onMessage = function (data) {
            this.fire("message", data)
        };
        Socket.prototype._onDisconnect = function () {
            var wasConnected = this.connected;
            this.connected = false;
            this.connecting = false;
            this._queueStack = [];
            if (wasConnected) {
                this.fire("disconnect")
            }
        };
        Socket.prototype.on = function (name, func) {
            if (!(typeof func == "function" && name)) {
                return this
            }
            if (name in this._events) {
                io.util.indexOf(this._events, func) == -1 && this._events[name].push(func)
            } else {
                this._events[name] = [func];
            }
            return this
        };
    })();


    function MessageCallback(error) {
        var timeoutMillis;
        this.timeout = null;
        this.onError = null;
        if (error && typeof error == "number") {
            timeoutMillis = error
        } else {
            timeoutMillis = 30000;
            this.onError = error;
        }
        this.resumeTimer = function () {
            if (timeoutMillis > 0 && (!this.timeout)) {
                this.timeout = setTimeout((new _readTimeoutTask(this)).run, timeoutMillis)
            }
        };
        this.pauseTimer = function () {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null
            }
        };
        this.readTimeOut = function (isTimeout) {
            if (isTimeout && this.onError) {
                this.onError(RongIMClient.callback.ErrorCode.setValue(0))
            } else {
                this.pauseTimer()
            }
        };

        function _readTimeoutTask(main) {
            this.run = function () {
                main.readTimeOut(true);
            }
        }
    }

    function MessageHandler(_client) {
        var client = _client,
            Map = {},
            self = this,
            mapping = {
                "1": 4,
                "2": 2,
                "3": 3,
                "4": 0,
                "5": 1,
                "6": 5
            },
            onReceived = null,
            connectCallback = null,
            typeMapping = {
                "RC:TxtMsg": "TextMessage",
                "RC:ImgMsg": "ImageMessage",
                "RC:VcMsg": "VoiceMessage",
                "RC:ImgTextMsg": "RichContentMessage",
                "RC:LBSMsg": "LocationMessage"
            },
            sysNtf = {
                "RC:InfoNtf": "InformationNotificationMessage",
                "RC:ContactNtf": "ContactNotificationMessage",
                "RC:ProfileNtf": "ProfileNotificationMessage",
                "RC:CmdNtf": "CommandNotificationMessage",
                "RC:DizNtf": "DiscussionNotificationMessage"
            };
        this.listener = {};

        this.putCallback = function (name, _publishCallback, _publishMessageId, _msg) {
            var item = {Callback: new client[name](_publishCallback.onSuccess, _publishCallback.onError), Message: _msg};
            item.Callback.resumeTimer();
            Map[_publishMessageId] = item;
        };
        this.setConnectCallback = function (_connectCallback) {
            if (_connectCallback) {
                connectCallback = new client.ConnectAck(_connectCallback.onSuccess, _connectCallback.onError);
                connectCallback.resumeTimer();
            }
        };
        this.setReceiveMessageListener = function (_listener) {
            if (!(_listener && "onReceived" in _listener)) {
                throw new SyntaxError("please use setOnReceiveMessageListener")
            }
            onReceived = _listener.onReceived;
            self.listener.onReceived = function (msg) {
                var entity, message, content, _index = -1,
                    con;
                if (msg.constructor._name != "PublishMessage") {
                    entity = msg;
                    io.util.cookieHelper.setCookie(client.userId, io.util.int64ToTimestamp(entity.dataTime || entity.getDataTime()), 86400);
                } else {
                    if (msg.getTopic() == "s_ntf") {
                        entity = Modules.NotifyMsg.decode(msg.getData());
                        client.syncTime(self.listener, entity.getType());
                        return;
                    } else if (msg.getTopic() == "s_msg") {
                        entity = Modules.DownStreamMessage.decode(msg.getData());
                        io.util.cookieHelper.setCookie(client.userId, io.util.int64ToTimestamp(entity.dataTime || entity.getDataTime()), 86400);
                    } else {
                        console.log(msg.getTopic());
                        return;
                    }
                }
                content = entity.getContent ? entity.getContent() : entity.content;
                var de = JSON.parse(binaryHelper.readUTF(content.offset ? io.util.arrayFrom(content.buffer).slice(content.offset, content.limit) : content)),
                    objectName = entity.classname || entity.getClassname();
                if ("Expression" in RongIMClient && "RC:TxtMsg" == objectName && de.content) {
                    de.content = de.content.replace(/[\uf000-\uf700]/g, function (x) {
                        return RongIMClient.Expression.calcUTF(x) || x;
                    })
                }
                if (objectName in typeMapping) {
                    message = new RongIMClient[typeMapping[objectName]](de);
                } else if (objectName in sysNtf) {
                    message = new RongIMClient[sysNtf[objectName]](de);
                    onReceived(message);
                    return;
                } else if (new RegExp(objectName).test(RongIMClient.registerMessageType.registerMessageTypePool)) {
                    message = new RongIMClient[objectName](de);
                } else {
                    message = new RongIMClient.UnknownMessage(de, objectName);
                }
                message.setSentTime(io.util.int64ToTimestamp(entity.dataTime || entity.getDataTime()));
                message.setSenderUserId(entity.fromUserId || entity.getFromUserId());
                message.setConversationType(mapping[entity.type || entity.getType()]);
                message.setTargetId(/^[234]$/.test(entity.type || entity.getType()) ? entity.groupId || entity.getGroupId() : entity.fromUserId || entity.getFromUserId());
                message.setMessageDirection(RongIMClient.MessageDirection.RECEIVE);
                message.setReceivedTime((new Date).getTime());
                message.setMessageId(message.getConversationType() + "_" + ~~(Math.random() * 0xffffff));
                message.setReceivedStatus(new RongIMClient.ReceivedStatus());
                con = io.util.filter(RongIMClient.getInstance().getConversationList(), function (item, i) {
                    if (item.getTargetId() == message.getTargetId()) {
                        _index = i;
                        return true
                    } else {
                        return false
                    }
                })[0] || io.util.remove(RongIMClient.getInstance().getOldestConversationTypeList(), function (item) {
                    return item.getTargetId() == message.getTargetId()
                });
                if (!con) {
                    con = new RongIMClient.Conversation();
                    con.setTargetId(message.getTargetId());
                    con.setConversationType(message.getConversationType());
                    con.setConversationTitle("")
                }
                if (/ISCOUNTED/.test(message.getMessageTag())) {
                    con.getConversationType() != 0 && con.setUnreadMessageCount(con.getUnreadMessageCount() + 1);
                }
                con.setReceivedTime((new Date).getTime());
                con.setReceivedStatus(new RongIMClient.ReceivedStatus());
                con.setSenderUserId(message.getSenderUserId());
                con.setObjectName(message.getObjectName());
                con.setNotificationStatus(RongIMClient.ConversationNotificationStatus.DO_NOT_DISTURB);
                con.setLatestMessageId(message.getMessageId());
                con.setLatestMessage(message);
                if (_index != 0) {
                    con.setTop()
                }
                onReceived(message)
            }
        };
        this.handleMessage = function (msg) {
            if (!msg) {
                return
            }
            switch (msg.constructor._name) {
                case "ConnAckMessage":
                    connectCallback.process(msg.getStatus(), msg.getUserId());
                    break;
                case "PublishMessage":
                    if (msg.getQos().currentValue() != 0) {
                        client.channel.writeAndFlush(new PubAckMessage(msg.getMessageId()));
                    }
                    if (onReceived) {
                        self.listener.onReceived(msg);
                    }
                    break;
                case "QueryAckMessage":
                    if (msg.getQos().currentValue() != 0) {
                        client.channel.writeAndFlush(new QueryConMessage(msg.getMessageId()))
                    }
                    var temp = Map[msg.getMessageId()];
                    if (temp) {
                        temp.Callback.process(msg.getStatus(), msg.getData(), msg.getDate(), temp.Message);
                        delete Map[msg.getMessageId()];
                    }
                    break;
                case "PubAckMessage":
                    var item = Map[msg.getMessageId()];
                    if (item) {
                        item.Callback.process(msg.getStatus() || 0, msg.getDate(), item.Message);
                        delete Map[msg.getMessageId()];
                    }
                    break;
                case "PingRespMessage":
                    client.pauseTimer();
                    break;
                case "DisconnectMessage":
                    client.channel.disconnect(msg.getStatus());
                    break;
                default:
            }
        }
    }

    function Client() {

        var timeoutMillis = 100000,
            lastReadTimer, task, self = this,
            _enum, _obj;
        this.timeout_ = null;
        this.appId = "";
        this.sdkVer = "1.0.1";
        this.apiVer = "1.0.0";
        this.channel = null;
        this.appToken = "";
        this.group = null;
        this.handler = null;
        this.userId = "";
        this.ConversationList = [];
        this.oldestConversation = [];
        this.ReceiveMessageListener = null;
        this.reconnectObj = {};
        this.heartbeat = null;
        this.chatroomId = 0;

        function timeout(x) {
            try {
                x.channel.disconnect()
            } catch (e) {
            }
            clearTimeout(x.timeout_);
            x.timeout_ = null;
            x.channel.reconnect();
            x.channel.socket.fire("StatusChanged", 5);
        }

        function _myTask(x) {
            var m = x;
            this.run = function () {
                if (!m.timeout_) {
                    return
                }
                timeout(m)
            }
        }

        function Channel(address, cb) {
            this.socket = io.connect(address.host + address.port + "?appId=" + self.appId + "&token=" + encodeURIComponent(self.appToken) + "&sdkVer=" + self.sdkVer + "&apiVer=" + self.apiVer, cb);
            this.writeAndFlush = function (val) {
                if (this.isWritable()) {
                    this.socket.send(val);
                } else {
                    this.reconnect({onSuccess: function () {
                        io.getInstance().send(val);
                    }, onError: function () {
                        throw new Error("reconnect fail")
                    }})
                }
            };
            this.reconnect = function (callback) {
                messageIdHandler.clearMessageId();
                this.socket = this.socket.reconnect();
                if (callback) {
                    self.reconnectObj = callback;
                }
            };
            this.disconnect = function (x) {
                this.socket.disconnect(x);
            };
            this.isWritable = function () {
                return io.getInstance().connected || io.getInstance().connecting
            };
            this.setConnectStatusListener = function (_enum, func) {
                if (typeof func == "object" && "onChanged" in func) {
                    this.socket.on("StatusChanged", function (code) {
                        if (code instanceof DisconnectionStatus) {
                            func.onChanged(_enum.setValue(code.getValue() + 2));
                            self.pauseTimer();
                            clearTimeout(self.heartbeat);
                            return;
                        }
                        func.onChanged(_enum.setValue(code))
                    })
                } else {
                    throw new TypeError("setConnectStatusListener:Parameter format is incorrect")
                }
            };
            this.socket.on("message", self.handler.handleMessage);
            this.socket.on("disconnect", function () {
                self.channel.socket.fire("StatusChanged", 4);
            })
        }

        function callbackMapping(entity, tag) {
            switch (tag) {
                case "GetUserInfoOutput":
                    var userInfo = new RongIMClient.UserInfo();
                    userInfo.setUserId(entity.getUserId());
                    userInfo.setUserName(entity.getUserName());
                    userInfo.setPortraitUri(entity.getUserPortrait());
                    return userInfo;
                case "GetQNupTokenOutput":
                    return {
                        deadline: io.util.int64ToTimestamp(entity.getDeadline()),
                        token: entity.getToken()
                    };
                case "GetQNdownloadUrlOutput":
                    return {
                        downloadUrl: entity.getDownloadUrl()
                    };
                case "CreateDiscussionOutput":
                    return entity.getId();
                case "ChannelInfoOutput":
                    var disInfo = new RongIMClient.Discussion();
                    disInfo.setCreatorId(entity.getAdminUserId());
                    disInfo.setId(entity.getChannelId());
                    disInfo.setMemberIdList(entity.getFirstTenUserIds());
                    disInfo.setName(entity.getChannelName());
                    disInfo.setopen(entity.getOpenStatus());
                    return disInfo;
                case "GroupHashOutput":
                    return entity.getResult();
                    break;
                case "QueryBlackListOutput":
                    return entity.getUserIds();
                default:
                    return {}
            }
        }

        this.removeConversationListCache = function () {
            var val = this.ConversationList.splice(30);
            this.oldestConversation.splice(10 - val.length);
            [].unshift.apply(this.oldestConversation, val);
        };
        this.resumeTimer = function () {
            if (!this.timeout_) {
                task = new _myTask(this);
                this.timeout_ = setTimeout(task.run, timeoutMillis)
            }
            lastReadTimer = (new Date).getTime()
        };
        this.pauseTimer = function () {
            if (this.timeout_) {
                clearTimeout(this.timeout_);
                this.timeout_ = null;
            }
        };
        this.setReceiveMessageListener = function (listener) {
            if (typeof listener == "object" && "onReceived" in listener) {
                this.ReceiveMessageListener = listener;
            }
        };
        this.setConnectionStatusListener = function (enums, obj) {
            _enum = enums;
            _obj = obj
        };
        this.connect = function (_token, _callback) {
            this.appToken = _token;
            if (Client.Endpoint.port && Client.Endpoint.host) {
                clearInterval(global.getEndpoint);
                if (io._TransportType == "websocket") {
                    if (!global.WebSocket) {
                        _callback.onError(RongIMClient.ConnectCallback.ErrorCode.setValue(1));
                        return;
                    }
                    if (WebSocket.loadFlashPolicyFile) {
                        WebSocket.loadFlashPolicyFile(Client.Endpoint.host.split(":")[0]);
                    }
                }
                this.handler = new MessageHandler(this);
                this.handler.setReceiveMessageListener(this.ReceiveMessageListener);
                this.channel = new Channel(Client.Endpoint, function () {
                    io._TransportType == "websocket" && self.keepLive();
                });
                this.handler.setConnectCallback(_callback);
                if (_enum && _obj) {
                    this.channel.setConnectStatusListener(_enum, _obj)
                }
                this.channel.socket.fire("StatusChanged", 1)
            } else {
                _callback.onError(RongIMClient.ConnectCallback.ErrorCode.setValue(5));
            }
        };

        this.keepLive = function () {
            self.heartbeat = setInterval(function () {
                self.resumeTimer();
                self.channel.writeAndFlush(new PingReqMessage());
                console.log("keep live pingReqMessage sending appId " + self.appId);
            }, 180000);
        };
        this.publishMessage = function (_topic, _data, _targetId, _callback, _msg) {
            var msgId = messageIdHandler.messageIdPlus(self.channel);
            if (!msgId) {
                return;
            }
            var msg = new PublishMessage(_topic, _data, _targetId);
            msg.setMessageId(msgId);
            if (_callback) {
                msg.setQos(new Qos(1));
                this.handler.putCallback("PublishCallback", _callback, msg.getMessageId(), _msg)
            } else {
                msg.setQos(new Qos(0));
            }
            this.channel.writeAndFlush(msg);
        };
        var userInfoMapping = {};
        this.queryMessage = function (_topic, _data, _targetId, _qos, _callback, pbtype) {
            if (_topic == "userInf") {
                if (userInfoMapping[_targetId]) {
                    _callback.onSuccess(userInfoMapping[_targetId]);
                    return;
                }
            }
            var msgId = messageIdHandler.messageIdPlus(self.channel);
            if (!msgId) {
                return;
            }
            var msg = new QueryMessage(_topic, _data, _targetId);
            msg.setMessageId(msgId);
            msg.setQos(_qos);
            this.handler.putCallback("QueryCallback", _callback, msg.getMessageId(), pbtype);
            this.channel.writeAndFlush(msg)
        };
        this.PublishCallback = function (cb, _timeout) {
            MessageCallback.call(this, _timeout);
            this.process = function (_staus, _serverTime, _msg) {
                this.readTimeOut();
                if (_staus == 0) {
                    if (_msg) {
                        _msg.setSentStatus(RongIMClient.SentStatus.RECEIVED)
                    }
                    cb();
                } else {
                    _timeout(RongIMClient.callback.ErrorCode.setValue(1))
                }
            };
            var arg = arguments.callee;
            this.readTimeOut = function (x) {
                arg.prototype.readTimeOut.call(this, x)
            }
        };
        this.PublishCallback.prototype = new MessageCallback();
        this.PublishCallback.prototype.constructor = this.PublishCallback;
        this.QueryCallback = function (cb, _timeout) {
            MessageCallback.call(this, _timeout);
            this.process = function (status, data, serverTime, pbtype) {
                this.readTimeOut();
                if (status == 0) {
                    if (pbtype && data) {
                        data = callbackMapping(Modules[pbtype].decode(data), pbtype);
                        if ("GetUserInfoOutput" == pbtype) {
                            userInfoMapping[data.getUserId()] = data;
                        }
                        cb(data);
                    } else {
                        cb(status, data, serverTime)
                    }
                } else {
                    _timeout(RongIMClient.callback.ErrorCode.setValue(1));
                }
            };
            var arg = arguments.callee;
            this.readTimeOut = function (x) {
                arg.prototype.readTimeOut.call(this, x)
            }
        };
        this.QueryCallback.prototype = new MessageCallback();
        this.QueryCallback.prototype.constructor = this.QueryCallback;
        this.ConnectAck = function (cb, _timeout) {
            MessageCallback.call(this, _timeout);
            this.process = function (status, userId) {
                this.readTimeOut();
                if (status.getValue() == 0) {
                    self.userId = userId;
                    self.syncTime(self.handler.listener);
                    if (self.reconnectObj.onSuccess) {
                        self.reconnectObj.onSuccess(userId);
                        delete self.reconnectObj.onSuccess;
                    } else {
                        cb(userId);
                    }
                    io.getInstance().fire("StatusChanged", 0);
                    io.getInstance()._doQueue()
                } else {
                    if (self.reconnectObj.onError) {
                        self.reconnectObj.onError(RongIMClient.ConnectCallback.ErrorCode.setValue(status.getValue()));
                        delete self.reconnectObj.onError;
                    } else {
                        _timeout(RongIMClient.ConnectCallback.ErrorCode.setValue(status.getValue()))
                    }
                }
            };
            var arg = arguments.callee;
            this.readTimeOut = function (x) {
                arg.prototype.readTimeOut.call(this, x)
            }
        };
        this.ConnectAck.prototype = new MessageCallback();
        this.ConnectAck.prototype.constructor = this.ConnectAck;
        var uptimesSyncTime = null,
            chatroomSyncTime = null;
        this.syncTime = function (_listener, _type) {
            var time, modules, str, target;
            if (_type != 2) {
                time = io.util.cookieHelper.getCookie(self.userId) || 0;
                if (uptimesSyncTime == time) {
                    return;
                }
                uptimesSyncTime = time;
                modules = new Modules.SyncRequestMsg();
                modules.setIspolling(false);
                str = 'pullMsg';
                target = self.userId;
            } else {
                time = io.util.cookieHelper.getCookie(self.userId + "CST") || 0;
                if (chatroomSyncTime == time) {
                    return;
                }
                chatroomSyncTime = time;
                modules = new Modules.ChrmPullMsg();
                modules.setCount(0);
                str = 'chrmPull';
                if (self.chatroomId === 0) {
                    throw new TypeError("syncTime:Received messages of chatroom but was not init");
                }
                target = self.chatroomId;
            }
            modules.setSyncTime(time);
            self.queryMessage(str, io.util.arrayFrom(modules.toArrayBuffer()), target, Qos.valueOf(1), {
                onSuccess: function (status, data) {
                    if (status == 0) {
                        var collection = Modules.DownStreamMessages.decode(data),
                            sync = io.util.int64ToTimestamp(collection.getSyncTime()),
                            symbol;
                        if (str == "pullMsg") {
                            symbol = self.userId;
                            uptimesSyncTime == sync && (uptimesSyncTime += "_");
                        } else {
                            symbol = self.userId + 'CST';
                            chatroomSyncTime == sync && (chatroomSyncTime += "_");
                        }
                        io.util.cookieHelper.setCookie(symbol, sync, 86400);
                        var list = collection.getList();
                        if (_listener) {
                            for (var i = 0; i < list.length; i++) {
                                _listener.onReceived(list[i])
                            }
                        }
                    } else {
                        uptimesSyncTime = null;
                    }
                },
                onError: function () {
                    uptimesSyncTime = null;
                }
            })
        }
    }

    Client.connect = function (appId, token, callback) {
        if (io.util.cookieHelper.getCookie("appId") != appId) {
            io.util.cookieHelper.removeAllCookie();
            io.util.cookieHelper.setCookie("appId", appId);
        }
        var client = new Client();
        client.appId = appId;
        Client.getServerEndpoint(token, appId, function () {
            client.connect(token, callback);
        }, callback.onError);
        return client;
    };
    Client.getServerEndpoint = function (_token, _appId, _onsuccess, _onerror) {
        var Url = {
                "navUrl-Debug": "http://nav.sunquan.rongcloud.net:9001/",
                "navUrl-Release": "http://nav.cn.rong.io/"
            },
            xss = document.createElement("script");
        xss.src = Url["navUrl-Debug"] + (io._TransportType == "xhr-polling" ? "cometnavi.js" : "navi.js") + "?appId=" + _appId + "&token=" + encodeURIComponent(_token) + "&" + "callBack=getServerEndpoint&t=" + (new Date).getTime();
        document.body.appendChild(xss);
        xss.onerror = function () {
            _onerror(RongIMClient.ConnectCallback.ErrorCode.setValue(4));
        };
        if ("onload" in xss) {
            xss.onload = _onsuccess;
        } else {
            xss.onreadystatechange = function () {
                if (xss.readyState == "loaded") {
                    _onsuccess();
                }
            }
        }
    };
    Client.Endpoint = {};
    global.getServerEndpoint = function (x) {
        Client.Endpoint.host = x.server;
        Client.Endpoint.port = "/websocket";
        Client.Endpoint.userId = x.userId;
    };

    function bridge(_appkey, _token, _callback) {
        bridge._client = Client.connect(_appkey, _token, _callback);
        var _topic = ["invtDiz", "crDiz", "qnUrl", "userInf", "dizInf", "userInf", "joinGrp", "quitDiz", "exitGrp", "evctDiz", ["ppMsgP", "pdMsgP", "pgMsgP", "pcMsgP", "chatMsg"], "pdOpen", "rename", "uGcmpr", "qnTkn", 'destroyChrm', 'createChrm', 'exitChrm', 'queryChrm', 'joinChrm', "pGrps", "addBlack", "rmBlack", "getBlack", "blackStat"];
        this.getIO = function () {
            return io
        };
        this.setConnectionStatusListener = function (one, two) {
            if (bridge._client) {
                bridge._client.setConnectionStatusListener(one, two);
                return true
            }
            return false
        };
        this.setReceiveMessageListener = function (_listener) {
            if (bridge._client) {
                bridge._client.setReceiveMessageListener(_listener)
            } else {
                throw new ReferenceError("NullPointException")
            }
        };
        this.removeConversationListCache = function () {
            bridge._client.removeConversationListCache()
        };
        this.getCurrentConversationList = function () {
            return bridge._client.ConversationList
        };
        this.clearConversations = function (list) {
            for (var i = 0; i < list.length; i++) {
                for (var j = 0; j < bridge._client.ConversationList.length; j++) {
                    var end = bridge._client.ConversationList[j].getConversationType() == list[i] && bridge._client.ConversationList.splice(j, 1);
                    if (end !== false) {
                        [].unshift.apply(bridge._client.oldestConversation, end);
                    }
                }
            }
            bridge._client.oldestConversation.splice(10);
            return true;
        };
        this.getCurrentOldestConversationList = function () {
            return bridge._client.oldestConversation
        };
        this.reConnect = function (callback) {
            bridge._client.channel.reconnect(callback)
        };
        this.disConnect = function () {
            clearTimeout(bridge._client.heartbeat);
            bridge._client.channel.disconnect()
        };
        this.queryMsg = function (topic, content, targetId, callback, pbname) {
            bridge._client.queryMessage(_topic[topic], content, targetId, Qos.valueOf(0), callback, pbname)
        };
        this.pubMsg = function (topic, content, targetId, callback, msg) {
            bridge._client.publishMessage(_topic[10][topic], content, targetId, callback, msg)
        }
    }

    global.RongBrIdge = bridge;
})(window);
(function (global, undefined) {
    global.RongIMClient = function (r) {
        function getType(str) {
            var temp = Object.prototype.toString.call(str).toLowerCase();
            return temp.slice(8, temp.length - 1);
        }

        var m, l = r,
            self = this,
            k = {
                "1": "3",
                "2": "1",
                "3": "2",
                "4": "0",
                "0": "4"
            },
            p, a, q = function (f, d) {
                var c = arguments.callee.caller;
                if (self.options.isEnableDebug()) {
                    console.log("Being executed: \n" + c);
                }
                if (c.length == c.arguments.length && (a || d)) {
                    for (var g = 0, e = c.arguments.length; g < e; g++) {
                        if (!new RegExp(getType(c.arguments[g])).test(f[g])) {
                            throw new TypeError("The index of " + g + " parameter was wrong type " + getType(c.arguments[g]) + " [" + f[g] + "]")
                        }
                    }
                } else {
                    throw new SyntaxError("The parameter is incorrect or was not yet instantiated RongIMClient")
                }
            },
            o = [],
            n = global.sessionStorage || new function () {
                var c = {};
                this.length = 0;
                this.clear = function () {
                    c = {};
                    this.length = 0
                };
                this.setItem = function (e, f) {
                    !c[e] && this.length++;
                    c[e] = f;
                    return e in c
                };
                this.getItem = function (e) {
                    return c[e]
                };
                this.removeItem = function (f) {
                    if (f in c) {
                        delete c[f];
                        this.length--;
                        return true;
                    }
                    return false;
                }
            };
        this.options = new RongIMClient.Options();
        this.clearTextMessageDraft = function (c, e) {
            q(["number", "string"]);
            return n.removeItem(c + "_" + e)
        };
        this.getTextMessageDraft = function (c, d) {
            q(["number", "string"]);
            return n.getItem(c + "_" + d)
        };
        this.saveTextMessageDraft = function (d, e, c) {
            q(["number", "string", "string"]);
            return n.setItem(d + "_" + e, c)
        };
        this.init = function (c) {
            l = c
        };
        this.getIO = function () {
            return m
        };
        this.connect = function (c, e) {
            q(["string", "object"], true);
            a = new global.RongBrIdge(l, c, e);
            m = a.getIO();
            if (o.length) {
                for (var d = 0; d < o.length; d++) {
                    a[o[d].name](o[d].args)
                }
                o = [];
            }
            if (p) {
                a.setConnectionStatusListener(RongIMClient.ConnectionStatusListener.ConnectionStatus, p)
            }
        };
        this.disconnect = function () {
            if (a) {
                a.disConnect()
            }
        };
        this.reconnect = function (callback) {
            q(["object"]);
            if (a) {
                a.reConnect(callback);
            }
        };
        this.getConversation = function (c, e) {
            q(["number", "string"]);
            return  m.util.filter(this.getConversationList(), function (f) {
                return f.getTargetId() == e && f.getConversationType() == c
            })[0] || null;
        };
        this.getConversationList = function () {
            return a.getCurrentConversationList();
        };
        this.getOldestConversationTypeList = function () {
            return a.getCurrentOldestConversationList()
        };
        this.getConversationNotificationStatus = function (f, d, e) {
            q(["number", "string", "object"]);
            var c = this.getConversation(f, d);
            if (c) {
                e.onSuccess(c.getNotificationStatus())
            } else {
                e.onError(RongIMClient.callback.ErrorCode.setValue(1))
            }
        };
        this.clearConversations = function (_conversationTypes) {
            q(["array"]);
            return a.clearConversations(_conversationTypes);
        };
        this.getGroupConversationList = function () {
            return m.util.filter(this.getConversationList(), function (c) {
                return c.getConversationType() == "3";
            })
        };
        this.removeConversation = function (c, e) {
            q(["number", "string"]);
            var d = m.util.remove(this.getConversationList(), function (f) {
                return f.getTargetId() == e && f.getConversationType() == c
            });
            this.getOldestConversationTypeList().unshift(d);
            this.removeConversationListCache()
        };
        this.removeConversationListCache = function () {
            a.removeConversationListCache()
        };
        this.setConversationNotificationStatus = function (f, d, g, e) {
            q(["number", "string", "number", "object"]);
            var c = this.getConversation(f, d);
            if (c) {
                c.setNotificationStatus(g);
                e.onSuccess(g)
            } else {
                e.onError(RongIMClient.callback.ErrorCode.setValue(1))
            }
        };
        this.setConversationToTop = function (c, e) {
            q(["number", "string"]);
            this.getConversation(c, e).setTop()
        };
        this.setConversationName = function (f, e, d) {
            q(["number", "string", "string"]);
            this.getConversation(f, e).setConversationTitle(d)
        };
        this.createConversation = function (f, d, e) {
            q(["number", "string", "string"]);
            var g = m.util.filter(this.getConversationList(), function (h) {
                return h.getTargetId() == d
            });
            if (g.length > 0) {
                return g[0]
            }
            var c = new RongIMClient.Conversation();
            c.setTargetId(d);
            c.setConversationType(f);
            c.setConversationTitle(e);
            c.setTop();
            return c
        };
        this.getCurrentUserInfo = function (callback) {
            q(["object"]);
            this.getUserInfo(global.RongBrIdge._client.userId, callback);
        };
        this.getUserInfo = function (c, e) {
            q(["string", "object"]);
            var d = new Modules.GetUserInfoInput();
            d.setNothing(1);
            a.queryMsg(5, m.util.arrayFrom(d.toArrayBuffer()), c, e, "GetUserInfoOutput")
        };
        this.sendMessage = function (h, v, e, c, u) {
            q(["number", "string", "object", "object|null|global", "object"]);
            if (!m.getInstance().connected) {
                u.onError(RongIMClient.callback.ErrorCode.setValue(1));
                return;
            }
            if (c) {
                c.process(e.getMessage())
            }
            if (!(e instanceof RongIMClient.MessageContent)) {
                e = new RongIMClient.MessageContent(e);
            }
            var f = k[h],
                g = e.encode(),
                i = e.getMessage(),
                d = -1,
                j;
            if (!f) {
                throw new ReferenceError("NullPointException")
            }
            i.setConversationType(h);
            i.setMessageDirection(RongIMClient.MessageDirection.SEND);
            if (!i.getMessageId())
                i.setMessageId(h + "_" + ~~(Math.random() * 0xffffff));
            i.setSentStatus(RongIMClient.SentStatus.SENDING);
            i.setSenderUserId(global.RongBrIdge._client.userId);
            i.setSentTime((new Date).getTime());
            i.setTargetId(v);
            if (/ISCOUNTED/.test(i.getMessageTag().toString())) {
                j = m.util.filter(this.getConversationList(), function (s, t) {
                    if (s.getTargetId() == v) {
                        d = t;
                        return true
                    }
                    return false
                })[0] || m.util.remove(this.getOldestConversationTypeList(), function (s) {
                    return s.getTargetId() == v
                });
                if (!j) {
                    j = new RongIMClient.Conversation();
                    j.setTargetId(v);
                    j.setConversationType(h);
                    j.setConversationTitle("")
                }
                j.setSentTime((new Date).getTime());
                j.setSentStatus(RongIMClient.SentStatus.SENDING);
                j.setSenderUserName("");
                j.setSenderUserId(global.RongBrIdge._client.userId);
                j.setObjectName(i.getObjectName());
                j.setNotificationStatus(RongIMClient.ConversationNotificationStatus.DO_NOT_DISTURB);
                j.setLatestMessageId(i.getMessageId());
                j.setLatestMessage(e);
                j.setUnreadMessageCount(0);
                if (d != 0) {
                    j.setTop()
                }
            }
            a.pubMsg(f, g, v, u, i)
        };
        this.setOptions = function (c) {
            this.options.setEnableDebug(c)
        };
        this.uploadMedia = function (f, c, d, e) {
            q(["number", "string", "string", "object"])
        };
        this.getUploadToken = function (c) {
            q(["object"]);
            var d = new Modules.GetQNupTokenInput();
            d.setType(1);
            a.queryMsg(14, m.util.arrayFrom(d.toArrayBuffer()), global.RongBrIdge._client.userId, c, "GetQNupTokenOutput")
        };
        this.getDownloadUrl = function (d, c) {
            q(["string", "object"]);
            var e = new Modules.GetQNdownloadUrlInput();
            e.setType(1);
            e.setKey(d);
            a.queryMsg(14, m.util.arrayFrom(e.toArrayBuffer()), global.RongBrIdge._client.userId, c, "GetQNdownloadUrlOutput")
        };
        this.setConnectionStatusListener = function (c) {
            if (!a) {
                p = c;
            } else {
                a.setConnectionStatusListener(RongIMClient.ConnectionStatusListener.ConnectionStatus, c);
            }
        };
        this.setOnReceiveMessageListener = function (c) {
            if (a) {
                a.setReceiveMessageListener(c)
            } else {
                o.push({
                    name: "setReceiveMessageListener",
                    args: c
                })
            }
        };
        //未读消息
        this.getTotalUnreadCount = function () {
            var count = 0;
            m.util.forEach(this.getConversationList(), function (x) {
                count += x.getUnreadMessageCount();
            });
            return count;
        };
        this.getUnreadCount = function (_conversationTypes, targetId) {
            q(["array|object", "string|undefined"]);
            var count = 0;
            if (getType(_conversationTypes) == "array") {
                var l = this.getConversationList();
                for (var i = 0; i < _conversationTypes.length; i++) {
                    m.util.forEach(l, function (x) {
                        x.getConversationType() == _conversationTypes[i] && (count += x.getUnreadMessageCount());
                    })
                }
            } else {
                if (_conversationTypes == 0) {
                    return count;
                }
                var end = m.util.filter(this.getConversationList(), function (x) {
                    return x.getConversationType() == _conversationTypes && x.getTargetId() == targetId;
                })[0];
                end && (count = end.getUnreadMessageCount());
            }
            return count;
        };
        this.clearMessagesUnreadStatus = function (conversationType, targetId) {
            q(["number", "string"]);
            if (conversationType == 0) {
                return false;
            }
            var end = m.util.filter(this.getConversationList(), function (x) {
                return x.getConversationType() == conversationType && x.getTargetId() == targetId;
            })[0];
            return !!(end ? end.setUnreadMessageCount(0) || 1 : 0);
        };
        //聊天室
        this.initChatRoom = function (Id) {
            q(["string"]);
            global.RongBrIdge._client.chatroomId = Id;
        };
        this.joinChatRoom = function (Id, defMessageCount, callback) {
            q(["string", "number", "object"]);
            var e = new Modules.ChrmInput();
            e.setNothing(1);
            a.queryMsg(19, m.util.arrayFrom(e.toArrayBuffer()), Id, {
                onSuccess: function () {
                    callback.onSuccess();
                    global.RongBrIdge._client.chatroomId = Id;
                    var modules = new Modules.ChrmPullMsg();
                    defMessageCount == 0 && (defMessageCount = -1);
                    modules.setCount(defMessageCount);
                    modules.setSyncTime(0);
                    global.RongBrIdge._client.queryMessage('chrmPull', m.util.arrayFrom(modules.toArrayBuffer()), Id, {
                        currentValue: function () {
                            return 1
                        }
                    }, {
                        onSuccess: function (status, data) {
                            if (status == 0) {
                                var collection = Modules.DownStreamMessages.decode(data),
                                    sync = m.util.int64ToTimestamp(collection.getSyncTime());
                                m.util.cookieHelper.setCookie(global.RongBrIdge._client.userId + 'CST', sync, 86400);
                                var list = collection.getList();
                                for (var i = 0; i < list.length; i++) {
                                    RongBrIdge._client.handler.listener.onReceived(list[i])
                                }
                            }
                        },
                        onError: function (x) {
                            callback.onError(x);
                        }
                    })
                },
                onError: function () {
                    callback.onError(RongIMClient.callback.ErrorCode.setValue(1));
                }
            }, "ChrmOutput");
        };
        this.quitChatRoom = function (Id, callback) {
            q(["string", "object"]);
            var e = new Modules.ChrmInput();
            e.setNothing(1);
            a.queryMsg(17, m.util.arrayFrom(e.toArrayBuffer()), Id, callback, "ChrmOutput")
        };
        //通知消息
        this.sendNotification = function (_conversationType, _targetId, _content, _callback) {
            q(["number", "string", "object", "object"]);
            if (_content instanceof RongIMClient.NotificationMessage)
                this.sendMessage(_conversationType, _targetId, new RongIMClient.MessageContent(_content), null, _callback);
            else
                throw new ReferenceError("Wrong Parameters");
        };
        this.sendStatus = function (_conversationType, _targetId, _content, _callback) {
            q(["number", "string", "object", "object"]);

            if (_content instanceof RongIMClient.StatusMessage)
                this.sendMessage(_conversationType, _targetId, new RongIMClient.MessageContent(_content), null, _callback);
            else
                throw new ReferenceError("Wrong Parameters");
        };
        //讨论组 群 聊天室
        this.setDiscussionInviteStatus = function (_targetId, _status, _callback) {
            q(["string", "number", "object"]);
            var modules = new Modules.ModifyPermissionInput();
            modules.setOpenStatus(_status);
            a.queryMsg(11, m.util.arrayFrom(modules.toArrayBuffer()), _targetId, _callback)
        };
        this.setDiscussionName = function (_discussionId, _name, _callback) {
            q(["string", "string", "object"]);
            var modules = new Modules.RenameChannelInput();
            modules.setName(_name);
            a.queryMsg(12, m.util.arrayFrom(modules.toArrayBuffer()), _discussionId, _callback)
        };
        this.removeMemberFromDiscussion = function (_disussionId, _userId, _callback) {
            q(["string", "string", "object"]);
            var modules = new Modules.ChannelEvictionInput();
            modules.setUser(_userId);
            a.queryMsg(9, m.util.arrayFrom(modules.toArrayBuffer()), _disussionId, _callback);
        };
        this.createDiscussion = function (_name, _userIdList, _callback) {
            q(["string", "array", "object"]);
            var modules = new Modules.CreateDiscussionInput();
            modules.setName(_name);
            a.queryMsg(1, m.util.arrayFrom(modules.toArrayBuffer()), global.RongBrIdge._client.userId, {
                onSuccess: function (data) {
                    var modules = new Modules.ChannelInvitationInput();
                    modules.setUsers(_userIdList);
                    a.queryMsg(0, m.util.arrayFrom(modules.toArrayBuffer()), data, {
                        onSuccess: function () {
                        },
                        onError: function () {
                            _callback.onError(RongIMClient.callback.ErrorCode.setValue(1));
                        }
                    });
                    _callback.onSuccess(data);
                },
                onError: function () {
                    _callback.onError(RongIMClient.callback.ErrorCode.setValue(1));
                }
            }, "CreateDiscussionOutput");
        };
        this.addMemberToDiscussion = function (_discussionId, _userIdList, _callback) {
            q(["string", "array", "object"]);
            var modules = new Modules.ChannelInvitationInput();
            modules.setUsers(_userIdList);
            a.queryMsg(0, m.util.arrayFrom(modules.toArrayBuffer()), _discussionId, _callback);
        };
        this.getDiscussion = function (_discussionId, _callback) {
            q(["string", "object"]);
            var modules = new Modules.ChannelInfoInput();
            modules.setNothing(1);
            a.queryMsg(4, m.util.arrayFrom(modules.toArrayBuffer()), _discussionId, _callback, "ChannelInfoOutput");
        };
        this.quitDiscussion = function (_discussionId, _callback) {
            q(["string", "object"]);
            var modules = new Modules.LeaveChannelInput();
            modules.setNothing(1);
            a.queryMsg(7, m.util.arrayFrom(modules.toArrayBuffer()), _discussionId, _callback);
        };
        this.quitGroup = function (_groupId, _callback) {
            q(["string", "object"]);
            var modules = new Modules.LeaveChannelInput();
            modules.setNothing(1);
            a.queryMsg(8, m.util.arrayFrom(modules.toArrayBuffer()), _groupId, _callback);
        }; //exitGrp
        this.joinGroup = function (_groupId, _groupName, _callback) {
            q(["string", "string", "object"]);
            var modules = new Modules.GroupInfo();
            modules.setId(_groupId);
            modules.setName(_groupName);
            var _mod = new Modules.GroupInput();
            _mod.setGroupInfo(modules);
            a.queryMsg(6, m.util.arrayFrom(_mod.toArrayBuffer()), _groupId, _callback, "GroupOutput");
        };
        this.syncGroup = function (_groups, _callback) {
            q(["array", "object"]);
            for (var i = 0, part = [], info = []; i < _groups.length; i++) {
                if (part.length === 0 || !new RegExp(_groups[i].getId()).test(part)) {
                    part.push(_groups[i].getId());
                    var groupinfo = new Modules.GroupInfo();
                    groupinfo.setId(_groups[i].getId());
                    groupinfo.setName(_groups[i].getName());
                    info.push(groupinfo);
                }
            }
            function nothing() {
                if (!global.MD5) {
                    _callback.onError(RongIMClient.callback.ErrorCode.setValue(1));
                }
                var modules = new Modules.GroupHashInput();
                modules.setUserId(global.RongBrIdge._client.userId);
                modules.setGroupHashCode(global.MD5(part.sort().join("")));
                a.queryMsg(13, m.util.arrayFrom(modules.toArrayBuffer()), global.RongBrIdge._client.userId, {
                    onSuccess: function (result) {
                        if (result === 1) {
                            var val = new Modules.GroupInput();
                            val.setGroupInfo(info);
                            a.queryMsg(20, m.util.arrayFrom(modules.toArrayBuffer()), global.RongBrIdge._client.userId, {
                                onSuccess: function () {
                                    _callback.onSuccess();
                                }, onError: function () {
                                    _callback.onError(RongIMClient.callback.ErrorCode.setValue(1));
                                }
                            }, "GroupOutput");
                        } else {
                            _callback.onSuccess();
                        }
                    }, onError: function () {
                        _callback.onError(RongIMClient.callback.ErrorCode.setValue(1));
                    }
                }, "GroupHashOutput");
            }

            if (typeof global.MD5 === "function") {
                nothing();
            } else {
                var scr = document.createElement("script");
                scr.src = "http://rongcloud-web-sdk.qiniudn.com/MD5.min.js";
                if (scr.readyState) {
                    scr.onreadystatechange = function () {
                        if (scr.readyState == "loaded") {
                            nothing();
                        }
                    }
                } else {
                    scr.onload = function () {
                        nothing();
                    };
                }
                scr.onerror = function () {
                    _callback.onError(RongIMClient.callback.ErrorCode.setValue(1))
                };
                document.body.appendChild(scr);
            }
        };
        this.addToBlacklist = function (userId, callback) {
            q(["string", "object"]);
            var modules = new Modules.Add2BlackListInput();
            modules.setUserId(userId);
            a.queryMsg(21, m.util.arrayFrom(modules.toArrayBuffer()), userId, callback);
        };
        this.getBlacklist = function (callback) {
            q(["object"]);
            var modules = new Modules.QueryBlackListInput();
            modules.setNothing(1);
            a.queryMsg(23, m.util.arrayFrom(modules.toArrayBuffer()), global.RongBrIdge._client.userId, callback, "QueryBlackListOutput");
        };
        this.getBlacklistStatus = function (userId, callback) {
            q(["string", "object"]);
            var modules = new Modules.BlackListStatusInput();
            modules.setUserId(userId);
            a.queryMsg(24, m.util.arrayFrom(modules.toArrayBuffer()), userId, {
                onSuccess: function (status) {
                    callback.onSuccess(RongIMClient.BlacklistStatus.setValue(status))
                }, onError: function () {
                    callback.onError(RongIMClient.callback.ErrorCode.setValue(1));
                }
            })
        };
        this.removeFromBlacklist = function (userId, callback) {
            q(["string", "object"]);
            var modules = new Modules.RemoveFromBlackListInput();
            modules.setUserId(userId);
            a.queryMsg(22, m.util.arrayFrom(modules.toArrayBuffer()), userId, callback);
        };
    };
    RongIMClient.version = "0.9.7";
    RongIMClient.connect = function (d, a) {
        if (!RongIMClient.getInstance) {
            throw new ReferenceError("please init")
        }
        if (global.Modules) {
            RongIMClient.getInstance().connect(d, a)
        } else {
            RongIMClient.connect.token = d;
            RongIMClient.connect.callback = a
        }
    };
    RongIMClient.hasUnreadMessages = function (appkey, token, callback) {
        var xss = document.createElement("script");
        xss.src = "http://api.cn.rong.io/message/exist.js?appKey=" + encodeURIComponent(appkey) + "&token=" + encodeURIComponent(token) + "&callBack=RongIMClient.hasUnreadMessages.RCcallback";
        document.body.appendChild(xss);
        xss.onerror = function () {
            callback.onError(RongIMClient.callback.ErrorCode.setValue(1));
        };
        RongIMClient.hasUnreadMessages.RCcallback = function (x) {
            callback.onSuccess(!!+x.status);
        };
    };
    RongIMClient.init = function (d) {
        var a = new RongIMClient(d);
        RongIMClient.getInstance = function () {
            return a
        };
        return a
    };
    RongIMClient.registerMessageType = function (regMsg) {
        if (!RongIMClient.getInstance) {
            throw new ReferenceError("unInitException")
        }
        if ("messageType" in regMsg && "objectName" in regMsg && "fieldName" in regMsg) {
            RongIMClient.registerMessageType.registerMessageTypePool.push(regMsg.messageType);
            var temp = RongIMClient[regMsg.messageType] = function (c) {
                RongIMClient.RongIMMessage.call(this, c);
                RongIMClient.MessageType[regMsg.messageType] = regMsg.messageType;
                this.setMessageType(regMsg.messageType);
                this.setObjectName(regMsg.objectName);
                for (var i = 0; i < regMsg.fieldName.length; i++) {
                    var item = regMsg.fieldName[i];
                    this["set" + item] = function (a) {
                        this.setContent(a, item);
                    };
                    this["get" + item] = function () {
                        return this.getDetail()[item];
                    };
                }
            };
            temp.prototype = new RongIMClient.RongIMMessage();
            temp.prototype.constructor = temp;
        } else
            throw new TypeError("registerMessageType:arguments type is error");
    };
    RongIMClient.registerMessageType.registerMessageTypePool = [];
    RongIMClient.setConnectionStatusListener = function (a) {
        if (!RongIMClient.getInstance) {
            throw new ReferenceError("unInitException")
        }
        RongIMClient.getInstance().setConnectionStatusListener(a)
    };
    RongIMClient.setOptions = function (a) {
        if (RongIMClient.getInstance) {
            RongIMClient.getInstance().setOptions(!!a);
        }
    };
    RongIMClient.RongIMMessage = function (content) {
        var x = "unknown",
            u, z = content || {},
            o, q, t, y, a, p, s, v, r;
        this.getDetail = function () {
            return z;
        };
        this.getMessageTag = function () {
            return ['ISPERSISTED', 'ISCOUNTED', 'ISDISPLAYED'];
        };
        this.getContent = function () {
            return z.content
        };
        this.getConversationType = function () {
            return o
        };
        this.getExtra = function () {
            return z.extra;
        };
        this.getMessageDirection = function () {
            return q
        };
        this.getMessageId = function () {
            return t
        };
        this.getObjectName = function () {
            return y
        };
        this.getReceivedStatus = function () {
            return a
        };
        this.getReceivedTime = function () {
            return u
        };
        this.getSenderUserId = function () {
            return p
        };
        this.getSentStatus = function () {
            return s
        };
        this.getTargetId = function () {
            return r
        };
        this.setContent = function (c, d) {
            z[d || "content"] = c
        };
        this.setConversationType = function (c) {
            o = c
        };
        this.setExtra = function (c) {
            z.extra = c;
        };
        this.setMessageDirection = function (c) {
            q = c
        };
        this.setMessageId = function (c) {
            t = c
        };
        this.setObjectName = function (c) {
            y = c
        };
        this.setReceivedStatus = function (c) {
            a = c
        };
        this.setSenderUserId = function (c) {
            p = c
        };
        this.setSentStatus = function (c) {
            return !!(s = c)
        };
        this.setSentTime = function (c) {
            v = c
        };
        this.getSentTime = function () {
            return v;
        };
        this.setTargetId = function (c) {
            r = c
        };
        this.setReceivedTime = function (c) {
            u = c
        };
        this.toJSONString = function () {
            var c = {
                "receivedTime": u,
                "messageType": x,
                "details": z,
                "conversationType": o,
                "direction": q,
                "messageId": t,
                "objectName": y,
                "senderUserId": p,
                "sendTime": v,
                "targetId": r
            };
            return JSON.stringify(c)
        };
        this.getMessageType = function () {
            return x
        };
        this.setMessageType = function (c) {
            x = c
        }
    };
    RongIMClient.NotificationMessage = function (c) {
        RongIMClient.RongIMMessage.call(this, c);
        this.getMessageTag = function () {
            return ['ISPERSISTED', "ISDISPLAYED"];
        };
    };
    RongIMClient.NotificationMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.NotificationMessage.prototype.constructor = RongIMClient.NotificationMessage;
    RongIMClient.StatusMessage = function (c) {
        RongIMClient.RongIMMessage.call(this, c);
        this.getMessageTag = function () {
            return ['NONE'];
        };
    };
    RongIMClient.StatusMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.StatusMessage.prototype.constructor = RongIMClient.StatusMessage;
    RongIMClient.Conversation = function () {
        var s = this,
            a = (new Date).getTime(),
            D, v, B, w, E, G, t, F, y, C, A, H, x, u = 0,
            z = RongIMClient.ConversationNotificationStatus.NOTIFY;
        this.getConversationTitle = function () {
            return G
        };
        this.toJSONString = function () {
            var c = {
                "senderUserName": E,
                lastTime: a,
                "objectName": D,
                "senderUserId": v,
                "receivedTime": B,
                "conversationTitle": G,
                "conversationType": t,
                "latestMessageId": C,
                "sentTime": H,
                "targetId": x,
                "notificationStatus": z
            };
            return JSON.stringify(c)
        };
        this.setReceivedStatus = function (c) {
            w = c
        };
        this.getReceivedStatus = function () {
            return w
        };
        this.getConversationType = function () {
            return t
        };
        this.getDraft = function () {
            return F
        };
        this.getLatestMessage = function () {
            return y
        };
        this.getLatestMessageId = function () {
            return C
        };
        this.getNotificationStatus = function () {
            return z
        };
        this.getObjectName = function () {
            return D
        };
        this.getReceivedTime = function () {
            return B
        };
        this.getSenderUserId = function () {
            return v
        };
        this.getSentStatus = function () {
            return A
        };
        this.getSentTime = function () {
            return H
        };
        this.getTargetId = function () {
            return x
        };
        this.getUnreadMessageCount = function () {
            return u
        };
        this.isTop = function () {
            var c = RongIMClient.getInstance().getConversationList();
            return c[0] == this
        };
        this.setConversationTitle = function (c) {
            G = c
        };
        this.setConversationType = function (c) {
            t = c
        };
        this.setDraft = function (c) {
            F = c
        };
        this.setSenderUserName = function (c) {
            E = c
        };
        this.setLatestMessage = function (c) {
            y = c
        };
        this.setLatestMessageId = function (c) {
            C = c
        };
        this.setNotificationStatus = function (c) {
            z = c
        };
        this.setObjectName = function (c) {
            D = c
        };
        this.setReceivedTime = function (c) {
            a = B = c
        };
        this.setSenderUserId = function (c) {
            v = c
        };
        this.getLatestTime = function () {
            return a
        };
        this.setSentStatus = function (c) {
            return !!(A = c)
        };
        this.setSentTime = function (c) {
            a = H = c
        };
        this.setTargetId = function (c) {
            x = c
        };
        this.setTop = function () {
            if (!s.getTargetId()) {
                return
            }
            var e = RongIMClient.getInstance().getConversationList(),
                c = -1,
                d = RongIMClient.getInstance().getIO().util.filter(e, function (f, g) {
                    if (f.getTargetId() == s.getTargetId()) {
                        c = g;
                        return true
                    }
                    return false
                })[0] || this;
            if (c != 0) {
                c > 0 ? d = e.splice(c, 1)[0] : undefined;
                e.unshift(d)
            }
            RongIMClient.getInstance().removeConversationListCache()
        };
        this.setUnreadMessageCount = function (c) {
            u = c
        }
    };
    RongIMClient.Discussion = function (m, l, a, q, p) {
        var s = m,
            t = l,
            r = a,
            o = q,
            n = p;
        this.getCreatorId = function () {
            return r
        };
        this.getId = function () {
            return s
        };
        this.getMemberIdList = function () {
            return n
        };
        this.getName = function () {
            return t
        };
        this.isOpen = function () {
            return o
        };
        this.setCreatorId = function (c) {
            r = c
        };
        this.setId = function (c) {
            s = c
        };
        this.setMemberIdList = function (c) {
            n = c
        };
        this.setName = function (c) {
            t = c
        };
        this.setOpen = function (c) {
            o = !!c
        }
    };
    RongIMClient.Group = function (j, l, a) {
        var h = j,
            k = l,
            i = a;
        this.getId = function () {
            return h
        };
        this.getName = function () {
            return k
        };
        this.getPortraitUri = function () {
            return i
        };
        this.setId = function (c) {
            h = c
        };
        this.setName = function (c) {
            k = c
        };
        this.setPortraitUri = function (c) {
            i = c
        }
    };
    RongIMClient.TextMessage = function (c) {
        RongIMClient.RongIMMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.TextMessage);
        this.setObjectName("RC:TxtMsg");
    };
    RongIMClient.TextMessage.obtain = function (text) {
        return new RongIMClient.TextMessage({
            content: text,
            extra: ""
        })
    };
    RongIMClient.TextMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.TextMessage.prototype.constructor = RongIMClient.TextMessage;
    RongIMClient.ImageMessage = function (c) {
        RongIMClient.RongIMMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.ImageMessage);
        this.setObjectName("RC:ImgMsg");
        this.setImageUri = function (a) {
            this.setContent(a, "imageUri")
        };
        this.getImageUri = function () {
            return this.getDetail().imageUri
        };
    };
    RongIMClient.ImageMessage.obtain = function (content, imageUri) {
        return new RongIMClient.ImageMessage({
            content: content,
            imageUri: imageUri,
            extra: ""
        });
    };
    RongIMClient.ImageMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.ImageMessage.prototype.constructor = RongIMClient.ImageMessage;
    RongIMClient.RichContentMessage = function (c) {
        RongIMClient.RongIMMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.RichContentMessage);
        this.setObjectName("RC:ImgTextMsg");
        this.setTitle = function (a) {
            this.setContent(a, "title")
        };
        this.getTitle = function () {
            return this.getDetail().title;
        };
        this.setImageUri = function (a) {
            this.setContent(a, "imageUri")
        };
        this.getImageUri = function () {
            return this.getDetail().imageUri;
        };
    };
    RongIMClient.RichContentMessage.obtain = function (title, content, imageUri) {
        return new RongIMClient.RichContentMessage({
            title: title,
            content: content,
            imageUri: imageUri,
            extra: ""
        })
    };
    RongIMClient.RichContentMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.RichContentMessage.prototype.constructor = RongIMClient.RichContentMessage;
    RongIMClient.VoiceMessage = function (c) {
        RongIMClient.RongIMMessage.call(this, c);
        this.setObjectName("RC:VcMsg");
        this.setMessageType(RongIMClient.MessageType.VoiceMessage);
        this.setDuration = function (a) {
            this.setContent(a, "duration")
        };
        this.getDuration = function () {
            return this.getDetail().duration;
        };
    };
    RongIMClient.VoiceMessage.obtain = function (content, duration) {
        return new RongIMClient.VoiceMessage({
            content: content,
            duration: duration,
            extra: ""
        })
    };
    RongIMClient.VoiceMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.VoiceMessage.prototype.constructor = RongIMClient.VoiceMessage;
    RongIMClient.HandshakeMessage = function () {
        RongIMClient.RongIMMessage.call(this);
        this.setMessageType(RongIMClient.MessageType.HandshakeMessage);
        this.setObjectName("RC:HsMsg");
    };
    RongIMClient.HandshakeMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.HandshakeMessage.prototype.constructor = RongIMClient.HandshakeMessage;
    RongIMClient.SuspendMessage = function () {
        RongIMClient.RongIMMessage.call(this);
        this.setMessageType(RongIMClient.MessageType.SuspendMessage);
        this.setObjectName("RC:SpMsg");
    };
    RongIMClient.SuspendMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.SuspendMessage.prototype.constructor = RongIMClient.SuspendMessage;
    RongIMClient.UnknownMessage = function (c, o) {
        RongIMClient.RongIMMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.UnknownMessage);
        this.setObjectName(o);
    };
    RongIMClient.UnknownMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.UnknownMessage.prototype.constructor = RongIMClient.UnknownMessage;
    RongIMClient.LocationMessage = function (c) {
        RongIMClient.RongIMMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.LocationMessage);
        this.setObjectName("RC:LBSMsg");
        this.setLatitude = function (a) {
            this.setContent(a, "latitude")
        };
        this.getLatitude = function () {
            return this.getDetail().latitude;
        };
        this.setLongitude = function (a) {
            this.setContent(a, "longitude")
        };
        this.getLongitude = function () {
            return this.getDetail().longitude;
        };
        this.setPoi = function (a) {
            this.setContent(a, "poi")
        };
        this.getPoi = function () {
            return this.getDetail().poi;
        };
    };
    RongIMClient.LocationMessage.obtain = function (content, latitude, longitude, poi) {
        return new RongIMClient.LocationMessage({
            content: content,
            latitude: latitude,
            longitude: longitude,
            poi: poi,
            extra: ""
        })
    };
    RongIMClient.LocationMessage.prototype = new RongIMClient.RongIMMessage();
    RongIMClient.LocationMessage.prototype.constructor = RongIMClient.LocationMessage;
    RongIMClient.DiscussionNotificationMessage = function (c) {
        RongIMClient.NotificationMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.DiscussionNotificationMessage);
        this.setObjectName("RC:DizNtf");
        var isReceived = false;
        this.getExtension = function () {
            return this.getDetail().extension;
        };
        this.getOperator = function () {
            return this.getDetail().operator;
        };
        this.getType = function () {
            return this.getDetail().type;
        };
        this.isHasReceived = function () {
            return isReceived;
        };
        this.setExtension = function (a) {
            this.setContent(a, "extension")
        };
        this.setHasReceived = function (x) {
            isReceived = !!x;
        };
        this.setOperator = function (a) {
            this.setContent(a, "operator")
        };
        this.setType = function (a) {
            this.setContent(a, "type");
            //1:加入讨论组 2：退出讨论组 3:讨论组改名 4：讨论组群主T人
        };
    };
    RongIMClient.DiscussionNotificationMessage.prototype = new RongIMClient.NotificationMessage();
    RongIMClient.DiscussionNotificationMessage.prototype.constructor = RongIMClient.DiscussionNotificationMessage;
    RongIMClient.InformationNotificationMessage = function (c) {
        RongIMClient.NotificationMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.InformationNotificationMessage);
        this.setObjectName("RC:InfoNtf");
    };
    RongIMClient.InformationNotificationMessage.obtain = function (content) {
        return new RongIMClient.InformationNotificationMessage({
            content: content,
            extra: ""
        })
    };
    RongIMClient.InformationNotificationMessage.prototype = new RongIMClient.NotificationMessage();
    RongIMClient.InformationNotificationMessage.prototype.constructor = RongIMClient.InformationNotificationMessage;
    RongIMClient.ContactNotificationMessage = function (c) {
        RongIMClient.NotificationMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.ContactNotificationMessage);
        this.setObjectName("RC:ContactNtf");
        this.getOperation = function () {
            return this.getDetail().operation;
        };
        this.setOperation = function (o) {
            this.setContent(o, 'operation');
        };
        this.setMessage = function (m) {
            this.setContent(m, 'message');
        };
        this.getMessage = function () {
            return this.getDetail().message;
        };
        this.getSourceUserId = function () {
            return this.getDetail().sourceUserId;
        };
        this.setSourceUserId = function (m) {
            this.setContent(m, 'sourceUserId');
        };
        this.getTargetUserId = function () {
            return this.getDetail().targetUserId;
        };
        this.setTargetUserId = function (m) {
            this.setContent(m, 'targetUserId');
        };
    };
    RongIMClient.ContactNotificationMessage.obtain = function (operation, sourceUserId, targetUserId, message) {
        return new RongIMClient.ContactNotificationMessage({
            operation: operation,
            sourceUserId: sourceUserId,
            targetUserId: targetUserId,
            message: message,
            extra: ""
        });
    };
    RongIMClient.ContactNotificationMessage.CONTACT_OPERATION_ACCEPT_RESPONSE = 'CONTACT_OPERATION_ACCEPT_RESPONSE';
    RongIMClient.ContactNotificationMessage.CONTACT_OPERATION_REJECT_RESPONSE = 'CONTACT_OPERATION_REJECT_RESPONSE';
    RongIMClient.ContactNotificationMessage.CONTACT_OPERATION_ACCEPT_RESPONSE = 'CONTACT_OPERATION_REQUEST';
    RongIMClient.ContactNotificationMessage.prototype = new RongIMClient.NotificationMessage();
    RongIMClient.ContactNotificationMessage.prototype.constructor = RongIMClient.ContactNotificationMessage;
    RongIMClient.ProfileNotificationMessage = function (c) {
        RongIMClient.NotificationMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.ProfileNotificationMessage);
        this.setObjectName("RC:ProfileNtf");
        this.getOperation = function () {
            return this.getDetail().operation;
        };
        this.setOperation = function (o) {
            this.setContent(o, 'operation');
        };
        this.getData = function () {
            return this.getDetail().data;
        };
        this.setData = function (o) {
            this.setContent(o, 'data');
        };
    };
    RongIMClient.ProfileNotificationMessage.obtain = function (operation, data) {
        return new RongIMClient.ProfileNotificationMessage({
            operation: operation,
            data: data,
            extra: ""
        });
    };
    RongIMClient.ProfileNotificationMessage.prototype = new RongIMClient.NotificationMessage();
    RongIMClient.ProfileNotificationMessage.prototype.constructor = RongIMClient.ProfileNotificationMessage;
    RongIMClient.CommandNotificationMessage = function (c) {
        RongIMClient.NotificationMessage.call(this, c);
        this.setMessageType(RongIMClient.MessageType.CommandNotificationMessage);
        this.setObjectName("RC:CmdNtf");
        this.getData = function () {
            return this.getDetail();
        };
        this.setData = function (o) {
            this.setContent(o);
        };
        this.getName = function () {
            return this.getDetail().name;
        };
        this.setName = function (o) {
            this.setContent(o, 'name');
        };
    };
    RongIMClient.CommandNotificationMessage.obtain = function (name, data) {
        return new RongIMClient.CommandNotificationMessage({
            name: name,
            data: data,
            extra: ""
        });
    };
    RongIMClient.CommandNotificationMessage.prototype = new RongIMClient.NotificationMessage();
    RongIMClient.CommandNotificationMessage.prototype.constructor = RongIMClient.CommandNotificationMessage;
    RongIMClient.MessageContent = function (f) {
        if (!(f instanceof RongIMClient.RongIMMessage)) {
            throw new Error("wrong parameter")
        }
        this.getMessage = function () {
            return f
        };
        this.encode = function () {
            var c = new Modules.UpStreamMessage();
            c.setSessionId(0);
            c.setClassname(f.getObjectName());
            c.setContent(JSON.stringify(f.getDetail()));
            var val = c.toArrayBuffer();
            if (Object.prototype.toString.call(val) == "[object ArrayBuffer]") {
                return [].slice.call(new Int8Array(val))
            }
            return val
        }
    };
    RongIMClient.MessageHandler = function (a) {
        if (typeof a == "function") {
            this.process = a;
        } else {
            throw new TypeError("MessageHandler:arguments type is error")
        }
    };
    RongIMClient.Options = function () {
        var a = false;
        this.isEnableDebug = function () {
            return a
        };
        this.setEnableDebug = function (d) {
            a = !!d
        }
    };
    RongIMClient.ReceivedStatus = function (d) {
        var a = d || 0;
        this.getFlag = function () {
            return a
        };
        this.isDownload = function () {
            return a == 1
        };
        this.isListened = function () {
            return a == 2
        };
        this.isRead = function () {
            return a == 3
        };
        this.setDownload = function () {
            a = 1
        };
        this.setListened = function () {
            a = 2
        };
        this.setRead = function () {
            a = 3
        };
    };
    RongIMClient.UserInfo = function (h, l, a) {
        var k = h,
            j = l,
            i = a;
        this.getUserName = function () {
            return j
        };
        this.getPortraitUri = function () {
            return i
        };
        this.getUserId = function () {
            return k
        };
        this.setUserName = function (c) {
            j = c
        };
        this.setPortraitUri = function (c) {
            i = c
        };
        this.setUserId = function (c) {
            k = c
        }
    };
    RongIMClient.MessageTag = {
        'ISPERSISTED': 'ISPERSISTED',
        'ISCOUNTED': 'ISCOUNTED',
        'NONE': 'NONE'
    };
    RongIMClient.ConversationNotificationStatus = {
        'DO_NOT_DISTURB': 0,
        'NOTIFY': 1,
        setValue: function (x) {
            return x * 1 || 0;
        }
    };
    RongIMClient.ConversationType = {
        'CHATROOM': 0,
        'CUSTOMER_SERVICE': 1,
        'DISCUSSION': 2,
        'GROUP': 3,
        'PRIVATE': 4,
        'SYSTEM': 5,
        setValue: function (x) {
            return x * 1 || 0;
        }
    };
    RongIMClient.SentStatus = {
        'DESTROYED': 0,
        'FAILED': 1,
        'READ': 2,
        'RECEIVED': 3,
        'SENDING': 4,
        'SENT': 5,
        setValue: function (x) {
            return x * 1 || 0;
        }
    };
    RongIMClient.DiscussionInviteStatus = {
        'CLOSED': 0,
        'OPENED': 1,
        setValue: function (x) {
            return x * 1 || 0;
        }
    };
    RongIMClient.MediaType = {
        'AUDIO': 0,
        'FILE': 1,
        'IMAGE': 2,
        'VIDEO': 3,
        setValue: function (x) {
            return x * 1 || 0;
        }
    };
    RongIMClient.MessageDirection = {
        'RECEIVE': 0,
        'SEND': 1,
        setValue: function (x) {
            return x * 1 || 0;
        }
    };
    RongIMClient.MessageType = {
        DiscussionNotificationMessage: "dizntf",
        TextMessage: "txt",
        ImageMessage: "img",
        VoiceMessage: "voice",
        RichContentMessage: "txtimg",
        HandshakeMessage: "handshake",
        UnknownMessage: "unknown",
        SuspendMessage: "suspend",
        LocationMessage: "location",
        InformationNotificationMessage: "information",
        ContactNotificationMessage: "contact",
        ProfileNotificationMessage: "profile",
        CommandNotificationMessage: "command"
    };
    RongIMClient.BlacklistStatus = {
        EXIT_BLACK_LIST: 0,
        NOT_EXIT_BLACK_LIST: 1,
        setValue: function (x) {
            return x * 1 || 0;
        }
    };
    RongIMClient.callback = function (d, a) {
        this.onError = a;
        this.onSuccess = d
    };
    RongIMClient.callback.ErrorCode = function (a) {
        var e = a || 0,
            f = navigator.language == "zh-CN" ? ["\u670D\u52A1\u5668\u8D85\u65F6", "\u672A\u77E5\u9519\u8BEF"] : ["TIMEOUT", "UNKNOWN ERROR"];
        this.TIMEOUT = 0;
        this.UNKNOW = 1;
        this.getMessage = function () {
            return f[e]
        };
        this.getValue = function () {
            return e
        }
    };
    RongIMClient.callback.ErrorCode.setValue = function (a) {
        return new RongIMClient.callback.ErrorCode(a)
    };
    RongIMClient.ConnectCallback = function () {
        RongIMClient.callback.apply(this, arguments)
    };
    RongIMClient.ConnectCallback.ErrorCode = function (a) {
        var d = 0,
            c = navigator.language == "zh-CN" ? ["\u63A5\u53D7", "\u4E0D\u53EF\u7528\u7684\u534F\u8BAE\u7248\u672C", "\u6807\u8BC6\u7B26\u88AB\u62D2\u7EDD", "\u670D\u52A1\u5668\u4E0D\u53EF\u7528", "TOKEN\u5931\u6548", "\u6CA1\u6709\u9A8C\u8BC1\u7528\u6237", "\u91CD\u5B9A\u5411"] : ["ACCEPTED", "UNACCEPTABLE_PROTOCOL_VERSION", "IDENTIFIER_REJECTED", "SERVER_UNAVAILABLE", "TOKEN_INCORRECT", "NOT_AUTHORIZED", "REDIRECT"];
        d = a;
        this.ACCPTED = 0;
        this.UNACCEPTABLE_PROTOCOL_VERSION = 1;
        this.IDENTIFIER_REJECTED = 2;
        this.SERVER_UNAVAILABLE = 3;
        this.TOKEN_INCORRECT = 4;
        this.NOT_AUTHORIZED = 5;
        this.REDIRECT = 6;
        this.getValue = function () {
            return d
        };
        this.getMessage = function () {
            return c[d];
        }
    };
    RongIMClient.ConnectCallback.ErrorCode.setValue = function (a) {
        return new RongIMClient.ConnectCallback.ErrorCode(a % 7);
    };
    RongIMClient.ConnectCallback.prototype = new RongIMClient.callback();
    RongIMClient.ConnectCallback.prototype.constructor = RongIMClient.ConnectCallback;
    RongIMClient.ConnectionStatusListener = function (a) {
        return {
            onChanged: a
        }
    };
    RongIMClient.ConnectionStatusListener.ConnectionStatus = function (a) {
        var e = a || 0,
            f = navigator.language == "zh-CN" ? ["\u8FDE\u63A5\u6210\u529F", "\u8FDE\u63A5\u4E2D", "\u91CD\u8FDE", "\u5F53\u524D\u5E10\u53F7\u5DF2\u5728\u5176\u4ED6\u5730\u65B9\u767B\u5F55", "\u5DF2\u5173\u95ED" , "\u672A\u77E5\u9519\u8BEF", "\u767B\u51FA", "\u9501\u5B9A"] : ["CONNECTED", "CONNECTING", "RECONNECT", "OTHER_DEVICE_LOGIN", "CLOSED", "UNKNOWN ERROR", "LOGOUT", "BLOCK"];
        this.CONNECTED = 0;
        this.CONNECTING = 1;
        this.RECONNECT = 2;
        this.OTHER_DEVICE_LOGIN = 3;
        this.CLOSED = 4;
        this.UNKNOW = 5;
        this.LOGOUT = 6;
        this.BLOCK = 7;
        this.getMessage = function () {
            return f[e]
        };
        this.getValue = function () {
            return e
        }
    };
    RongIMClient.ConnectionStatusListener.ConnectionStatus.setValue = function (a) {
        return new RongIMClient.ConnectionStatusListener.ConnectionStatus(a)
    };
    RongIMClient.OnReceiveMessageListener = function (a) {
        return {
            onReceived: a
        }
    }
})(window);