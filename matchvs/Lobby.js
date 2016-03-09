(function () {
	var d = document,
	w = window,
	p = parseInt,
	dd = d.documentElement,
	db = d.body,
	dc = d.compatMode == 'CSS1Compat',
	dx = dc ? dd: db,
	ec = encodeURIComponent;
	
	
	w.LOBBY = {
		username:null,
		userid:null,
		socket:null,
		cbRecvPos:null,
		cbRecvLogout:null,
		cbRecvLogin:null,
		gameLayer:null,
		//提交聊天消息内容
		sendPosition:function(x,y){
			var obj = {
				userid: this.userid,
				x:x,
				y:y
			};
			
			this.socket.emit('position', obj);
			return false;
		},
		genUid:function(){
			return new Date().getTime()+""+Math.floor(Math.random()*899+100);
		},

		onLogin:function(o)
		{
			o.gameLayer = gameLayer;
			if(cbRecvLogin){
				cbRecvLogin(o);
			}
		},

		onLogout:function(o)
		{
			o.gameLayer = gameLayer;
			if(cbRecvLogout){
				cbRecvLogout(o);
			}
		},

		onPosition:function(o)
		{
			o.gameLayer = gameLayer;
			if(cbRecvPos){
				cbRecvPos(o);
			}
		},

		updateSysMsg:function(o, action){
			if(action == "login"){
				LOBBY.onLogin(o);
			}

			else if( action == "position")
			{
				LOBBY.onPosition(o);
			}

			else if(action == "logout"){
				LOBBY.onLogout(o);
			}
		
		},

		usernameSubmit:function(){
			var username = d.getElementById("username").value;
			if(username != ""){
				d.getElementById("username").value = '';
				d.getElementById("loginbox").style.display = 'none';
				d.getElementById("Container").style.display = 'block';
				MW.USER_NAME = username;
			}
			return false;
		},
	
		init:function(callback){
			/*
			客户端根据时间和随机数生成uid,这样使得聊天室用户名称可以重复。
			实际项目中，如果是需要用户登录，那么直接采用用户的uid来做标识就可以
			*/
			gameLayer = callback.gameLayer;
			cbRecvLogin = callback.cbRecvLogin;
			cbRecvLogout = callback.cbRecvLogout;
			cbRecvPos = callback.cbRecvPos;


			this.userid = this.genUid();

			
			//连接websocket后端服务器
			this.socket = io.connect('ws://h5.matchvs.com:9051');
			
			//告诉服务器端有用户登录
			this.socket.emit('login', {userid:this.userid, username:MW.USER_NAME, x:100, y:60});
			
			//监听新用户登录
			this.socket.on('login', function(o){
				LOBBY.updateSysMsg(o, 'login');	
			});
			
			//监听用户退出
			this.socket.on('logout', function(o){
				LOBBY.updateSysMsg(o, 'logout');
			});
			
			//监听消息发送
			this.socket.on('position', function(o){
				LOBBY.updateSysMsg(o, 'position');
			});

		}
	};
	
})();