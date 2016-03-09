//
// MoonWarriors
//
// Handles the Game Logic
//

STATE_PLAYING = 0;
STATE_GAMEOVER = 1;

var GameLayer = cc.Layer.extend({
    _time:null,
    _ship:null,
    _ships:{},
    _backSky:null,
    _backSkyHeight:0,
    _backSkyRe:null,
    _backTileMap:null,
    _backTileMapHeight:0,
    _backTileMapRe:null,
    _levelManager:null,
    _tmpScore:0,
    _isBackSkyReload:false,
    _isBackTileReload:false,
    lbScore:null,
    screenRect:null,
    explosionAnimation:[],
    _beginPos:cc.p(0, 0),
    _state:STATE_PLAYING,
    _isTouch:false,
    ctor:function () {
        cc.associateWithNative( this, cc.Layer );
    },
    init:function () {
        var bRet = false;
        if (this._super()) {
            // reset global values
            MW.CONTAINER.ENEMIES = [];
            MW.CONTAINER.ENEMY_BULLETS = [];
            MW.CONTAINER.PLAYER_BULLETS = [];
            MW.SCORE = 0;
            MW.LIFE = 4;
            MW.LIFE2 = 4;
            this._state = STATE_PLAYING;

            //Explosion.sharedExplosion();
            //Enemy.sharedEnemy();
            winSize = cc.Director.getInstance().getWinSize();
           // this._levelManager = new LevelManager(this);
            this.initBackground();
            this.screenRect = cc.rect(0, 0, winSize.width, winSize.height + 10);

            // score
            this.lbScore = cc.LabelTTF.create("Score: 0", "Arial",14,cc.SizeMake(80,14),cc.TEXT_ALIGNMENT_RIGHT);
            this.lbScore.setAnchorPoint(cc.p(1,0));
            this.addChild(this.lbScore, 1000);
            this.lbScore.setPosition(cc.p(winSize.width - 5 , winSize.height - 20));


            // ship life
            var shipTexture = cc.TextureCache.getInstance().addImage(s_ship01);
            var life = cc.Sprite.createWithTexture(shipTexture, cc.rect(0, 0, 60, 38));
            life.setScale(0.6);
            life.setPosition(cc.p(30, 460));
            this.addChild(life, 1, 5);


            // ship Life count
            this._lbLife = cc.LabelTTF.create("0", "Arial", 20);
            this._lbLife.setPosition(cc.p(60, 463));
            this._lbLife.setColor(cc.red());
            this.addChild(this._lbLife, 1000);


            // ship
            this._ship = new Ship();
            this.addChild(this._ship, this._ship.zOrder, MW.UNIT_TAG.PLAYER);

            // accept touch now!

            var t = cc.config.deviceType;
            if( t == 'browser' )  {
                this.setTouchEnabled(true);
                this.setKeyboardEnabled(true);
            } else if( t == 'desktop' ) {
                this.setMouseEnabled(true);
            } else if( t == 'mobile' ) {
                this.setTouchEnabled(true);
            }

            // schedule
            this.scheduleUpdate();
         //   this.schedule(this.scoreCounter, 1);

            if (MW.SOUND) {
                cc.AudioEngine.getInstance().playBackgroundMusic(s_bgMusic, true);
            }

            var callback = {};
            callback.gameLayer = this;
            callback.cbRecvPos = this.onPosition;
            callback.cbRecvLogout = this.onLogout;
            callback.cbRecvLogin = this.onLogin;

            LOBBY.init(callback);
            bRet = true;
        }
        return bRet;
    },

    appendUser:function(o){
            var ship = new Ship(o.userid, o.username);
            var curPos = cc.p(o.x, o.y);
            ship.setPosition(curPos);
            this.addChild(ship, ship.zOrder, MW.UNIT_TAG.PLAYER);
            this._ships[o.userid] = ship;
    },

    removeUser:function(userid){
            var ship = this._ships[userid]
            if(ship == null){
                return;
            }

            ship.destroy();
            delete this._ships[userid];
  
    },

    checkUser:function(o){
        for(var userid in o.onlineUsers){
            if(userid == LOBBY.userid){
                continue;
            }

            if(this._ships.hasOwnProperty(userid)){
                continue;
            }

            this.appendUser(o.onlineUsers[userid]);
        }
    },

    onLogin:function(o){
        var userid = o.user.userid;
        MW.SHIP_COUNT = o.onlineCount;

        var gameLayer = o.gameLayer;
        if(LOBBY.userid == userid){
            gameLayer.checkUser(o);
            return;
        }

        gameLayer.appendUser(o.user);
    },

    onLogout:function(o){
        var userid = o.user.userid;
        MW.SHIP_COUNT = o.onlineCount;

        if(LOBBY.userid == userid){
            return;
        }

        var gameLayer = o.gameLayer;
        gameLayer.removeUser(userid);
    },

    onPosition:function(o){
        var userid = o.userid;
        if(LOBBY.userid == userid){
            return;
        }

        var gameLayer = o.gameLayer;

        var ship = gameLayer._ships[userid]
        if(ship == null){
            return;
        }

        var Pos = {x:o.x, y:o.y};

        ship.setPosition(Pos);
    },

    onTouchesBegan:function(touches, event){
        this._isTouch = true;
    },
    onTouchesMoved:function (touches, event) {
        if(this._isTouch){
            this.processEvent(touches[0]);
        }
    },
    onTouchesEnded:function(touches, event){
        this._isTouch = false;
    },
    onMouseDragged:function( event ) {
        if(this._isTouch){
            this.processEvent( event );
        }
    },

    processEvent:function( event ) {
        if( this._state == STATE_PLAYING ) {
            var delta = event.getDelta();
            var curPos = this._ship.getPosition();
            curPos= cc.pAdd( curPos, delta );
            curPos = cc.pClamp(curPos, cc.POINT_ZERO, cc.p(winSize.width, winSize.height) );
            this._ship.setPosition( curPos );
            LOBBY.sendPosition(curPos.x, curPos.y);
        }
    },

    onKeyDown:function (e) {
        MW.KEYS[e] = true;
    },

    onKeyUp:function (e) {
        MW.KEYS[e] = false;
    },

    update:function (dt) {
        if( this._state == STATE_PLAYING ) {
            this.removeInactiveUnit(dt);
            this.updateUI();
        }

        //if( cc.config.deviceType == 'browser' )
         //   cc.$("#cou").innerHTML = "Ship:" + 1 + ", Enemy: " + MW.CONTAINER.ENEMIES.length + ", Bullet:" + MW.CONTAINER.ENEMY_BULLETS.length + "," + MW.CONTAINER.PLAYER_BULLETS.length + " all:" + this.getChildren().length;
    },
    
    removeInactiveUnit:function (dt) {
        var selChild, layerChildren = this.getChildren();
        for (var i in layerChildren) {
            selChild = layerChildren[i];
            if (selChild) {
                if( typeof selChild.update == 'function' ) {
                    selChild.update(dt);
                    var tag = selChild.getTag();
                    if ((tag == MW.UNIT_TAG.PLAYER) || (tag == MW.UNIT_TAG.PLAYER_BULLET) ||
                        (tag == MW.UNIT_TAG.ENEMY) || (tag == MW.UNIT_TAG.ENMEY_BULLET)) {
                        if (selChild && !selChild.active) {
                            selChild.destroy();
                        }
                    }
                }
            }
        }
    },
    
    updateUI:function () {
        if (this._tmpScore < MW.SCORE) {
            this._tmpScore += 5;
        }
        this._lbLife.setString(MW.SHIP_COUNT);
        this.lbScore.setString("Score: " + this._tmpScore);
    },
    collide:function (a, b) {
        var aRect = a.collideRect();
        var bRect = b.collideRect();
        if (cc.rectIntersectsRect(aRect, bRect)) {
            return true;
        }
    },
    initBackground:function () {
        // bg
        this._backSky = cc.Sprite.create(s_bg01);
        this._backSky.setAnchorPoint(cc.p(0, 0));
        this._backSkyHeight = this._backSky.getContentSize().height;
        this.addChild(this._backSky, -10);

        //tilemap
        this._backTileMap = cc.TMXTiledMap.create(s_level01);
        this.addChild(this._backTileMap, -9);
        this._backTileMapHeight = this._backTileMap.getMapSize().height * this._backTileMap.getTileSize().height;

        this._backSkyHeight -= 48;
        this._backTileMapHeight -= 200;
        this._backSky.runAction(cc.MoveBy.create(3, cc.p(0, -48)));
        this._backTileMap.runAction(cc.MoveBy.create(3, cc.p(0, -200)));

        this.schedule(this.movingBackground, 3);
    },
    movingBackground:function () {
        this._backSky.runAction(cc.MoveBy.create(3, cc.p(0, -48)));
        this._backTileMap.runAction(cc.MoveBy.create(3, cc.p(0, -200)));
        this._backSkyHeight -= 48;
        this._backTileMapHeight -= 200;

        if (this._backSkyHeight <= winSize.height) {
            if (!this._isBackSkyReload) {
                this._backSkyRe = cc.Sprite.create(s_bg01);
                this._backSkyRe.setAnchorPoint(cc.p(0, 0));
                this.addChild(this._backSkyRe, -10);
                this._backSkyRe.setPosition(cc.p(0, winSize.height));
                this._isBackSkyReload = true;
            }
            this._backSkyRe.runAction(cc.MoveBy.create(3, cc.p(0, -48)));
        }
        if (this._backSkyHeight <= 0) {
            this._backSkyHeight = this._backSky.getContentSize().height;
            this.removeChild(this._backSky, true);
            this._backSky = this._backSkyRe;
            this._backSkyRe = null;
            this._isBackSkyReload = false;
        }

        if (this._backTileMapHeight <= winSize.height) {
            if (!this._isBackTileReload) {
                this._backTileMapRe = cc.TMXTiledMap.create(s_level01);
                this.addChild(this._backTileMapRe, -9);
                this._backTileMapRe.setPosition(cc.p(0, winSize.height));
                this._isBackTileReload = true;
            }
            this._backTileMapRe.runAction(cc.MoveBy.create(3, cc.p(0, -200)));
        }
        if (this._backTileMapHeight <= 0) {
            this._backTileMapHeight = this._backTileMapRe.getMapSize().height * this._backTileMapRe.getTileSize().height;
            this.removeChild(this._backTileMap, true);
            this._backTileMap = this._backTileMapRe;
            this._backTileMapRe = null;
            this._isBackTileReload = false;
        }
    },
    onGameOver:function () {
        var scene = cc.Scene.create();
        scene.addChild(GameOver.create());
        cc.Director.getInstance().replaceScene(cc.TransitionFade.create(1.2, scene));
    }
});

GameLayer.create = function () {
    var sg = new GameLayer();
    if (sg && sg.init()) {
        return sg;
    }
    return null;
};

GameLayer.scene = function () {
    var scene = cc.Scene.create();
    var layer = GameLayer.create();
    scene.addChild(layer, 1);
    return scene;
};
