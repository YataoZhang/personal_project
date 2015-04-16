## AJAX
`AJAX`即`“Asynchronous Javascript And XML”（异步JavaScript和XML）`，是指一种创建交互式网页应用的网页开发技术。<br/>
+   AJAX = 异步 JavaScript和XML（标准通用标记语言的子集）
+   AJAX 是一种用于创建快速动态网页的技术
+   通过在后台与服务器进行少量数据交换
+   AJAX可以使网页实现异步更新。这意味着可以在不重新加载整个网页的情况下，对网页的某部分进行更新。
+   传统的网页（不使用 AJAX）如果需要更新内容，必须重载整个网页页面。

### 什么是AJAX？
AJAX只是是一个前端技术，不是一个新的语言。它是利用浏览器提供操作`HTTP`的接口(`XMLHttpRequest`或者`ActiveXObject`)来操作`HTTP`以达到异步的效果。<br/>
### 网页渲染的同步与异步的区别
*   同步：当你在浏览器的地址栏里输入百度网址并访问的时候，浏览器都是创建新的tabpage、新的内存块、加载网页的全部资源、渲染加载过来的资源。这些那都是从头开始的，就想上帝创作世界一样。只要与后台交互数据，那怕数据只有那么一丢丢，也得重新创造一次世界，如此反复。浏览器自己控制`HTTP`操作
*   异步：不需要重新创造一次世界，用之前已经存在的世界来达到目的。与后台交互数据不需要重新来渲染页面.自己来控制`HTTP`操作。

### HTTP介绍
*HTTP (HyperText Transfer Protocol) 超文本传输协议*  在当前web环境中走的流量大部分都是走的`HTTP`流量，也就是说你在浏览器中访问任何东西，那怕是一张小图片也是`HTTP`来给你当搬运工显示在你面前的。而且AJAX就是基于HTTP来传输数据的。所以要想精通AJAX，适当的了解并掌握HTTP是十分必要的。
#### web客户端和服务器
web内容都是存储在web服务器上的，web服务器所使用的是http协议，因此经常会被称为http服务器。这些http服务器存储量因特网中的数据，如果http客服端发出请求的话，它们会提供数据。客户端向服务器发送http请求，服务器会在http响应中会送所请求的数据。http客服端和http服务器共同构成了万维网的基本组建。可能你每天都是使用http客服端。最常见的http客户端就是浏览器。web浏览器向服务器请求http对象，并将这些对象显示在你的屏幕上。
#### HTTP事务
一个http事务由一条(从客户端发往服务器的)请求命令和一个(从服务器发回客户端的)响应结果组成。这种通信时通过名为`HTTP message`的格式化数据块进行的。
只有当请求和响应都成功时此http事务才算成功，也就是这条http才算成功。只有当其中任意一个命令(请求或者响应)失败，那么这个http就算失败。
*一个http就是一个http事务*，且http事务完成之后此http不可在复用。

#### http报文
http报文是由一行一行的简单字符串组成的。http报文都是纯文本，不是二进制代码，所以人们可以很方便地对其进行读写。<br/>
http报文分为三部分：
>+  起始行
>报文的第一行就是起始行，在请求报文中用来说明做些什么，在响应报文中说明出现了什么情况。
>+  首部字段
>起始行后面有零个或多个首部字段。每个首部字段都包含了一个名字和一个值，首部分为5种类型:<br/>
>`通用首部、请求首部、响应首部、实体首部、扩展首部`<br/>
>+  主体
报文主体包含了所有类型的数据。请求主体中报错了要发送给web服务器的数据；响应主体中装载了要返回给客户端的数据。起始行和首部字段都是结构化的文本形式的，而主体可以包含任意的二进制数据。当然，主体中也可以包含文本。

#### HTTP 方法
http支持几种不同的请求命令，这些命令被称为`http方法` 每条http请求报文都包括一个方法。这个方法会告诉服务器执行什么动作(获取一个web页面、运行一个网关程序、删除一个文件)。<br/>
>常见来http方法如下
>+   GET 从服务器向客户端发送命名资源，主要是传给服务器一些参数来获取服务器上指定的资源。
>+   POST 将客户端数据发送到一个服务器网关程序。
>+   DELETE 从服务器上删除命名资源
>+   HEAD 仅发送命名资源中的http首部
>+   PUT 将来自客户端的数据存储到一个服务器资源中去
>+   TRACE 对报文进行追踪
>+   OPTIONS 决定可以从服务器上执行哪些方法

GET与POST的区别：<br/>
+   URL长度限制 浏览器对URL有大小限制，chrome 8k firefox 7k ie 2k
+   资源大小限制：get方法限制大小，get是将数据直接拼接在URL后端query部分，而浏览器是对URL有长度限制的，所以get有大小限制。post不限制大小。因为post是将数据放到请求的主体里，而主体是不限制大小的，所以post没有大小限制。
+   功能 get主要是用来从服务器拉取数据，而post主要是用来将数据发送到服务器。
+   安全 get可以看到发送给服务器的数据，而post不会被看到，因为post把数据放到主体里了。

#### HTTP 状态码
每条http响应报文返回时都会携带一个状态码。状态码是一个三位数字的代码，告知客户端请求是否成功，或者是否需要采取其他操作。<br/>
几种常见的状态码：
>+   200 OK 文档正确返回
>+   301 Redirect 永久重定向。一直从其他地方去获取资源
>+   302 Redirect 临时重定向。临时到其他地方去获取资源
>+   303 see other、307 Temporary Redirect 将客服端重定向到一个负载不大的服务器上，用于负载均衡和服务器失联
>+   404 Not Found 无法找到这个资源
>+   500 Internal Server Error 服务器错误

伴随着每个数字状态码，http还会发送一条解释性的`原因短语`文本。包含文本短语主要是为了进行描述，所有的处理过程使用的都是数字码。<br/>
http软件处理下列状态码和原因短语的方式是一样的：
>+   200 OK
>+   200 Document attached
>+   200 Success
>+   200 All's cool, dude




### MIME Type
因特网上有数千种不同的数据类型，http仔细地给每种要通过web传输的对象都打上了名为MIME类型(MIME Type)的数据格式标签。最初设计MIME(Multipurpose Internet Mail Extension，多用途因特网邮件扩展) 是为了解决在不同的电子邮件系统之间搬移报文时存在的问题。MIME在电子邮件系统中工作得非常好，因此HTTP也采纳了它，用它来描述并标记多媒体内容。<br/>
web服务器会为所有的http对象数据附加一个MIME类型。当web浏览器从服务器中取回一个对象时，回去查看相关的MIME类型，看看它是否知道应该如何处理这个对象。大多数浏览器都可以处理数百种常见的对象类型。<br/>
*MIME类型是一种文本标记，表示一种主要的对象类型和一个特定的子类型，中间由一条斜杠来分隔。*
+   html格式的文本文档有`text/html`类型来标记
+   普通的ASCII文本文档由`text/plain`类型来标记
+   JPEG格式的图片为`image/jpeg`类型
+   GIF格式的图片为`image/gif`类型

MIME类型在HTTP协议中的表现为`Request Header`或者`Response Header`中的`Content-Type`还有`Content-length`

### URI、URL、URN
>URI : 每个web服务器资源都有一个名字，这样客户端就可以说明他们感兴趣的资源是什么了。服务器资源名被称为`统一资源标识符(Uniform Resource Identifier，URI)` URI就像因特网上的邮政地址一样，在世界范围内唯一标识并定位信息资源。<br/>
>例如 [https://www.baidu.com/img/baidu_jgylogo3.gif](https://www.baidu.com/img/baidu_jgylogo3.gif)
>这是一个百度服务器上一个图片资源的URI

>URL : `统一资源定位符(URL)` 是资源标识符最常见的形式。URL描述了一台特定服务器上某资源的特定位置。它们可以明确说明如何从一个精确、固定的位置获取资源。<br/>
>例如 ：https(http协议)://www.baidu.com(进入百度服务器)/img/baidu_jgylogo3.gif(获取路径为/img/baidujgylogo3.gif的图片)
>大部分的URL都遵循一种标准格式，这种格式分为三部分。
> +   第一部分 `方案(scheme)`，说明了访问资源所使用的协议类型。着部分通常就是http协议。
> +   第二部分 服务器位置，给出来服务器的因特网地址(比如，www.baidu.com)。
> +   第三部分 资源路径，指定了web服务器上的某个资源(比如，/img/baidujgylogo3.gif)。
>*现在，几乎所有的URI都是URL*
>大多数的URL方案的URL语法都建立在这个有9部分构成的通用格式上：<br/>
>`<scheme>://<user>:<password>@<host>:<port>/<path>;<params>?<query>#<frag>`<br/>

>URN : `URI` 的第二种形式就是`统一资源名称(URN)`。URN是作为特定内容的唯一名称使用的，与目前资源地无关。使用这些与位置无关的URN>，就可以将资源四处搬移。通过URN，还可以用同一个名字通过多种网络访问协议来访问资源。<br/>
>比如，不论因特网标准文档RFC 2141 位于何处(甚至可以将其复制到多个地方)，都可以用下列URN来命名它：<br/>
>`urn:ietf:rdc:2141`<br/>
>URN目前仍然处于试验阶段。

URI包括两种形式，一种是URL一种是URN。目前大部分会不加区别的使用URI和URL。因为URL是URI的一个子集。

#### 方案
`方案`实际上是规定如何访问指定资源的主要标识符，它会告诉负责解析URL的应用程序应该使用什么协议，最常见的就是HTTP方案。
常见的方案格式:<br/>
>-   http 超文本传输协议方案，默认端口为80
>-   https 方案https和方案http是一对，为一个区别在于使用了网景的SSL，SSL为http提供了端到端的加密机制。默认端口为443
>-   mailto 指向Email地址。
>-   ftp 文件传输协议，可以用来从ftp服务器上传下载文件
>-   file 访问本地文件
>-   telnet 用于交互式访问业务

### 浏览器兼容性
在IE8以下版本的IE系列浏览器中，要应用AJAX必须使用`ActiveXObject(这个对象是一个微软推广和支持在Internet Explorer中，不在Windows应用商店的应用程序。)` 方法。在标准浏览器(chrome、firefox、opera、safari、ie7+)当中则使用`XMLHttpRequest`对象。
### 如何发起AJAX?
在低版本IE(8-)中使用`ActiveXObject`构造AJAX对象时需要传入一个String类型的参数`Microsoft.XMLHTTP`，也可以使用`Msxml3.XMLHTTP`和`Msxml2.XMLHTTP`。因为一开始是`Microsoft.XMLHTTP` 之后变成`Msxml2.XMLHTTP`及更新版的`Msxml3.XMLHTTP`
```js
// code for IE6, IE5
 var xmlhttp1 = new ActiveXObject("Microsoft.XMLHTTP");
 var xmlhttp2 = new ActiveXObject("Msxml2.XMLHTTP");
 var xmlhttp3 = new ActiveXObject("Msxml3.XMLHTTP");
```
在标准浏览器中则使用`XMLHttpRequest`对象
```js
// code for IE7+, Firefox, Chrome, Opera, Safari
var xmlhttp = new XMLHttpRequest();
```
为了在项目中可以在任何浏览器中使用AJAX所以我们必须做一个判断，如果浏览器为低版本ie就是用`ActiveXObject`对象否则使用`XMLHttpRequest`对象。代码如下：
```js
var XHR = function () {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        // code for IE7+, Firefox, Chrome, Opera, Safari
        xmlhttp = new XMLHttpRequest();
    }
    else {
        // code for IE6, IE5
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    return xmlhttp;
  };
var xmlObj=XHR();
console.log(xmlObj);
```
这样的话，我们就可以得到一个在任何浏览器都能发起AJAX的方法。但是这样左右一个坏处，就是每次获取AJAX对象时都会判断一次，这样做很费时费力。所以，我们利用`惰性函数`的概念来实现一个只需要第一次判断，后面都不需要判断的方法。
```js
 var XHR = function () {
 //将浏览器支持的AJAX对象放入一个function中，并且根据固定的顺序放到一个队列里。
        for (var AJAXObj = [function () {
            return new XMLHttpRequest
        }, function () {
            return new ActiveXObject("Msxml2.XMLHTTP")
        }, function () {
            return new ActiveXObject("Msxml3.XMLHTTP")
        }, function () {
            return new ActiveXObject("Microsoft.XMLHTTP")
        }], val = null, index = 0; index < AJAXObj.length; index++) {
        //此方法的核心，如果当前浏览器支持此对象就用val保存起来，用保存当前最适合ajax对象的function替换XHR方法，并且结束该循环。这样第二次执行XHR方法时就不需要循环，直接就能得到当前浏览器最适ajax对象。如果都不支持就抛出自定义引用错误。
            try {
                val = AJAXObj[index]()
            } catch (b) {
                continue
            }
            //假设当前浏览器为标准浏览器，此处执行完毕之后console.log(XHR);
            //结果为：function () {
            //  return new XMLHttpRequest
            //};XHR成功替换。
            XHR=AJAXObj[index];
            break
        }
        if (!val) {
            throw new ReferenceError("XMLHttpRequest is not supported")
        }
        return val;
    };
  var xmlObj=XHR();
  console.log(xmlObj);
```
本方法的核心就是利用 `惰性函数` 。这才是正点。第一次计算得到的值，供内部函数调用，然后用这个内部函数重置外部函数（因为同名），以后就不用计算了，也不用判断分支条件。这时函数就相当于一个被赋值的变量。接下来我们以此介绍`XMLHttpRequest`和`ActiveXObject`如何使用。

#### 使用XMLHttpRequest
XMLHttpRequest 是一个 JavaScript 对象,它最初由微软设计,随后被 Mozilla,Apple, 和 Google采纳. 如今,该对象已经被 W3C组织标准化. 通过它,你可以很容易的取回一个URL上的资源数据. 尽管名字里有XML, 但XMLHttpRequest 可以取回所有类型的数据资源,并不局限于XML. 而且除了HTTP ,它还支持file 和 ftp 协议.<br/>
创建一个 XMLHttpRequest 实例, 可以使用如下语句:
```js
var req = new XMLHttpRequest();
```
XMLHttpRequest 让发送一个HTTP请求变得非常容易。你只需要简单的创建一个请求对象实例，打开一个URL，然后发送这个请求。当传输完毕后，结果的HTTP状态以及返回的响应内容也可以从请求对象中获取。本页把这个强大的JavaScript对象的一些常用的甚至略有晦涩的使用案例进行了一下概述。<br/>
XMLHttpRequest对象方法概述：
+   **返回值**   **方法(参数)**
+   void `abort`();
+   DOMString `getAllResponseHeaders`();
+   DOMString? `getResponseHeader`(DOMString header);
+   void `open`(DOMString method, DOMString url, optional boolean async, optional DOMString? user, optional DOMString? +   password);
+   void `overrideMimeType`(DOMString mime);
+   void `send`();
+   void `send`(ArrayBuffer data);
+   void `send`(Blob data);
+   void `send`(Document data);
+   void `send`(DOMString? data);
+   void `send`(FormData data);
+   void `setRequestHeader`(DOMString header, DOMString value);

XMLHttpRequest对象属性概述：

-   **属性名**  **格式类型**  **说明**
-   `onreadystatechange`  `Function?`	 一个JavaScript函数对象，当readyState属性改变时会调用它。回调函数会在user interface线程中调用。(`警告: 不能在本地代码中使用. 也不应该在同步模式的请求中使用.`)
-   `readyState` 	`unsigned short	` 请求的五种状态: 0	UNSENT (未打开)	open()方法还未被调用、 1	OPENED  (未发送)	send()方法还未被调用、2	HEADERS_RECEIVED (已获取响应头)	send()方法已经被调用, 响应头和响应状态已经返回、 3	LOADING (正在下载响应体)	响应体下载中; responseText中已经获取了部分数据、 4	DONE (请求完成)	整个请求过程已经完毕.
-   `response` 	`varies`	响应实体的类型由 responseType 来指定， 可以是 ArrayBuffer， Blob， Document， JavaScript 对象 (即 "json")， 或者是字符串。如果请求未完成或失败，则该值为 null。
-   `responseText`	 `DOMString`	此次请求的响应为文本，或是当请求未成功或还未发送时为 null。只读。
-   `responseType` 	`XMLHttpRequestResponseType` 设置该值能够改变响应类型。就是告诉服务器你期望的响应格式： `"" (空字符串)`	 字符串(默认值)、 `"arraybuffer"` 	ArrayBuffer、 `"blob"`	 Blob、 `"document"` 	Document、 `"json"`	 JavaScript、 `"text"` 	字符串。
-   `responseXML` 	`Document?	` 本次请求的响应是一个 Document 对象，如果是以下情况则值为 null：请求未成功，请求未发送，或响应无法被解析成 XML 或 HTML。当响应为text/xml 流时会被解析。当 responseType 设置为"document"，并且请求为异步的，则响应会被当做 text/html 流来解析。只读.(`注意: 如果服务器不支持 text/xml Content-Type 头，你可以使用 overrideMimeType() 强制 XMLHttpRequest 将响应解析为 XML。`)
-   `status` 	`unsigned short`	该请求的响应状态码 (例如, 状态码200 表示一个成功的请求).只读.
-   `statusText` 	`DOMString`	该请求的响应状态信息,包含一个状态码和原因短语 (例如 "200 OK"). 只读.
-   `upload` 	`XMLHttpRequestUpload`	可以在 upload 上添加一个事件监听来跟踪上传过程。
-   `withCredentials` 	`boolean` 表明在进行跨站(cross-site)的访问控制(Access-Control)请求时，是否使用认证信息(例如cookie或授权的header)。 默认为 false。*注意: 这不会影响同站(same-site)请求.*

##### 方法
###### abort()
```js
req.abort();
```
如果请求已经被发送,则立刻中止请求(canceled).
###### getAllResponseHeaders()
```js
var allHeaders = req.getAllResponseHeaders();
```
返回所有响应头信息(响应头名和值), 如果响应头还没接受,则返回null. (`注意: For multipart requests, this returns the headers from the current part of the request, not from the original channel.`)
###### getResponseHeader()
```js
var dateHeader = req.getAllResponseHeaders("Date");
```
返回指定的响应头的值, 如果响应头还没被接受,或该响应头不存在,则返回null.
###### open()
*注意: Calling this method an already active request (one for which open()or openRequest()has already been called) is the equivalent of calling abort().*
```js
req.open(http Method,URL,isAsync,userName,password);
//参数
//http Method 请求所使用的HTTP方法; "POST" 或者 "GET". 如果下个参数是非HTTP(S)的URL,则忽略该参数.
//URL 该请求所要访问的URL
//isAsync An optional boolean parameter, defaulting to true, indicating whether or not to perform the operation asynchronously. If this value is false, the send()method does not return until the response is received. If true, notification of a completed transaction is provided using event listeners. This must be true if the multipart attribute is true, or an exception will be thrown.
//userName The optional user name to use for authentication purposes; by default, this is an empty string.
//password The optional password to use for authentication purposes; by default, this is an empty string.
```
初始化一个请求. 该方法用于JavaScript代码中;如果是本地代码, 使用 openRequest()方法代替.

###### overrideMimeType()
```js
req.overrideMimeType("text/html");
//参数必须为MIME Type格式
```
Overrides the MIME type returned by the server. This may be used, for example, to force a stream to be treated and parsed as text/xml, even if the server does not report it as such.This method must be called before send().

###### send()
*注意: 所有相关的事件绑定必须在调用send()方法之前进行.*
```js
req.send(undefined||null||ArrayBuffer||Blob||XML||String||FormData);
//此方法有7种参数重载
```
发送请求. 如果该请求是异步模式(默认),该方法会立刻返回. 相反,如果请求是同步模式,则直到请求的响应完全接受以后,该方法才会返回.<br/>
*If the data is a Document, it is serialized before being sent. When sending a Document, versions of Firefox prior to version 3 always send the request using UTF-8 encoding; Firefox 3 properly sends the document using the encoding specified by body.xmlEncoding, or UTF-8 if no encoding is specified.*<br/>
*If it's an nsIInputStream, it must be compatible with nsIUploadChannel's setUploadStream()method. In that case, a Content-Length header is added to the request, with its value obtained using nsIInputStream's available()method. Any headers included at the top of the stream are treated as part of the message body. The stream's MIMEtype should be specified by setting the Content-Type header using the setRequestHeader()method prior to calling send().*

###### setRequestHeader()
```js
req.setRequestHeader("header","value");
//设置制定的请求头，此方法必须在send()执行之前执行。
//header 将要被赋值的请求头名称.
//value 给指定的请求头赋的值.
```
给指定的HTTP请求头赋值.在这之前,你必须确认已经调用 open() 方法打开了一个url.

#### 浏览器兼容性
<div id="compat-desktop" style="display: block;">
<table class="compat-table">
 <tbody>
  <tr>
   <th>Feature</th>
   <th>Chrome</th>
   <th>Firefox (Gecko)</th>
   <th>Internet Explorer</th>
   <th>Opera</th>
   <th>Safari (WebKit)</th>
  </tr>
  <tr>
   <td>Basic support (XHR1)</td>
   <td>1</td>
   <td>1.0</td>
   <td>5 (via ActiveXObject)<br>
    7 (XMLHttpRequest)</td>
   <td><span style="color: #888;" title="Please update this with the earliest version of support.">(Yes)</span></td>
   <td>1.2</td>
  </tr>
  <tr>
   <td>send(ArrayBuffer)</td>
   <td>9</td>
   <td>9</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
   <td>11.60</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
  </tr>
  <tr>
   <td>send(Blob)</td>
   <td>7</td>
   <td>3.6</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
   <td>12</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
  </tr>
  <tr>
   <td>send(FormData)</td>
   <td>6</td>
   <td>4</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
   <td>12</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
  </tr>
  <tr>
   <td>response</td>
   <td>10</td>
   <td>6</td>
   <td>10</td>
   <td>11.60</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
  </tr>
  <tr>
   <td>responseType = 'arraybuffer'</td>
   <td>10</td>
   <td>6</td>
   <td>10</td>
   <td>11.60</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
  </tr>
  <tr>
   <td>responseType = 'blob'</td>
   <td>19</td>
   <td>6</td>
   <td>10</td>
   <td>12</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
  </tr>
  <tr>
   <td>responseType = 'document'</td>
   <td>18</td>
   <td>11</td>
   <td><span style="color: #f00;">未实现</span></td>
   <td><span style="color: #f00;">未实现</span></td>
   <td><span style="color: #f00;">未实现</span></td>
  </tr>
  <tr>
   <td>responseType = 'json'</td>
   <td><span style="color: #f00;">未实现</span></td>
   <td>10</td>
   <td><span style="color: #f00;">未实现</span></td>
   <td>12</td>
   <td><span style="color: #f00;">未实现</span></td>
  </tr>
  <tr>
   <td>Progress Events</td>
   <td>7</td>
   <td>3.5</td>
   <td>10</td>
   <td>12</td>
   <td><span style="color: rgb(255, 153, 0);" title="Compatibility unknown; please update this.">?</span></td>
  </tr>
  <tr>
   <td>withCredentials</td>
   <td>3</td>
   <td>3.5</td>
   <td>10</td>
   <td>12</td>
   <td>4</td>
  </tr>
 </tbody>
</table>
</div>

#### 使用ActiveXObject

### AJAX 示例

