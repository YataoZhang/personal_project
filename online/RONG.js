//        this.setCredentials = function (_appId, _token) {
//            if ((!appId && appId == "") && (_token)) {
//                throw new TypeError("setCredentials:It is not valId to supply a token without supplying a appId.")
//            }
//            appId = _appId;
//            token = _token;
//            hasAppId = appId != null;
//            hasToken = token != null
//        };
//        this.setWil = function (wt, w, wq, rw) {
//            if ((!wt ? 1 : 0 ^ !w ? 1 : 0) || (!w ? 1 : 0 ^ !wq ? 1 : 0)) {
//                throw new TypeError("setWil:Can't set willTopic, will or willQoS value independently")
//            }
//            willTopic = wt;
//            will = w;
//            willQos = wq;
//            retainWill = rw;
//            hasWill = !!willTopic
//        };
//        this.getProtocolId = function () {
//            return protocolId
//        };
//        this.getProtocolVersion = function () {
//            return protocolVersion
//        };
//        this.getClientId = function () {
//            return clientId
//        };
//        this.getKeepAlive = function () {
//            return keepAlive
//        };
//        this.getAppId = function () {
//            return appId
//        };
//        this.getToken = function () {
//            return token
//        };
//        this.isCleanSession = function () {
//            return cleanSession
//        };
//        this.setWillTopic = function (_willTopic) {
//            willTopic = _willTopic
//        };
//        this.getWillTopic = function () {
//            return willTopic
//        };
//        this.getWill = function () {
//            return will
//        };
//        this.getWillQoS = function () {
//            return willQoS
//        };
//        this.isWillRetained = function () {
//            return retainWill
//        };
//        this.hasAppId = function () {
//            return hasAppId
//        };
//        this.hasToken = function () {
//            return hasToken
//        };
//        this.hasWill = function () {
//            return hasWill
//        }



//        function readMsgLength(In) {
//            var msgLength = 0,
//                multiplier = 1,
//                digit, _in = binaryHelper.convertStream(In);
//            do {
//                digit = _in.read();
//                msgLength += (digit & 127) * multiplier;
//                multiplier *= 128
//            } while ((digit & 128) > 0);
//            return msgLength
//        }
//
//        function writeMsgLength(Out, main) {
//            var out = binaryHelper.convertStream(Out),
//                val = main.messageLength();
//            do {
//                lengthSize++;
//                var b = val & 127;
//                val >>= 7;
//                if (val > 0) {
//                    b |= 128
//                }
//                if (b > 255) {
//                    var _byte = b.toString(2);
//                    b = parseInt(_byte.slice(_byte.length - 8), 2)
//                }
//                out.write(b)
//            } while (val > 0);
//            return out
//        }
//
//        function writeMsgCode(Out, main) {
//            var val = main.messageLength(),
//                code = _headerCode,
//                out = binaryHelper.convertStream(Out);
//            do {
//                var b = val & 127;
//                val >>= 7;
//                if (val > 0) {
//                    b |= 128
//                }
//                code = code ^ b
//            } while (val > 0);
//            if (code > 255) {
//                var _byte = code.toString(2);
//                code = parseInt(_byte.slice(_byte.length - 8), 2)
//            }
//            out.write(code);
//            return out
//        }