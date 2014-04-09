var skin = require('minecraft-skin');

module.exports = function (game, opts) {
    return new Player(game, opts);
};
module.exports.pluginInfo = {
  loadAfter: ['voxel-keys']
};

function Player(game, opts) {
        this.game = game;
        if (!game.isClient) return;
        this.keys = game.plugins.get('voxel-keys'); // optional

        var mountPoint;
        var possessed;
       
        opts = opts || {};
        opts.homePosition = opts.homePosition || [0, 0, 0];
        opts.homeRotation = opts.homeRotation || [0, 0, 0];
        opts.skinOpts = opts.skinOpts || {};
        opts.skinOpts.scale = opts.skinOpts.scale || new game.THREE.Vector3(0.04, 0.04, 0.04);

        var playerSkin = skin(game.THREE, opts.image, opts.skinOpts);
        var player = playerSkin.mesh;
        var physics = this.physics = game.makePhysical(player);
        physics.playerSkin = playerSkin;
        
        player.position.set(0, 562, -20);
        game.scene.add(player);
        game.addItem(physics);
        
        physics.yaw = player;
        physics.pitch = player.head;
        physics.subjectTo(game.gravity);
        physics.blocksCreation = true;
        
        game.control(physics);
        
        physics.move = function (x, y, z) {
            var xyz = parseXYZ(x, y, z);
            physics.yaw.position.x += xyz.x;
            physics.yaw.position.y += xyz.y;
            physics.yaw.position.z += xyz.z;
        };
        
        physics.moveTo = function (x, y, z) {
            var xyz = parseXYZ(x, y, z);
            physics.yaw.position.x = xyz.x;
            physics.yaw.position.y = xyz.y;
            physics.yaw.position.z = xyz.z;
        };
        
        var pov = 1;
        physics.pov = function (type) {
            if (type === 'first' || type === 1) {
                pov = 1;
            }
            else if (type === 'third' || type === 3) {
                pov = 3;
            }

            physics.possess();
        };

        physics.show = function (show) {
            // TODO: change visibility of entire skin model all at once instead of individual meshes
            this.playerSkin.rightArm.visible = show;
            this.playerSkin.leftArm.visible = show;
            this.playerSkin.body.visible = show;
            this.playerSkin.rightLeg.visible = show;
            this.playerSkin.leftLeg.visible = show;
            this.playerSkin.head.visible = show;
        };
        
        physics.toggle = function () {
            physics.pov(pov === 1 ? 3 : 1);
        };
        
        physics.possess = function () {
            if (possessed) possessed.remove(game.camera);
            else this.home();
            var key = pov === 1 ? 'cameraInside' : 'cameraOutside';
            player[key].add(game.camera);
            possessed = player[key];

            // don't show player in first person mode, gets in the way when you look down
            this.show(pov !== 1);
        };
       
        physics.home = function () {
            this.position.set(opts.homePosition[0], opts.homePosition[1], opts.homePosition[2]); // TODO: figure out .apply()
            this.rotation.set(opts.homeRotation[0], opts.homeRotation[1], opts.homeRotation[2]);
        };

        physics.enable = function () {
            physics.possess();
        };

        physics.disable = function () {
            if (possessed) possessed.remove(game.camera); // TODO: fix
        };
        
        physics.position = physics.yaw.position;

        this.enable();

        return physics;
};

Player.prototype.enable = function () {
    this.physics.enable();

    var physics = this.physics;

    if (this.keys) {
      this.keys.down.on('pov', this.onPov = function() { physics.toggle(); });
      this.keys.down.on('home', this.onHome = function() { physics.home(); });
    }
};

Player.prototype.disable = function () {
    this.physics.disable();

    if (this.keys) {
      this.keys.down.removeListener('pov', this.onPov);
      this.keys.removeListener('home', this.onHome);
    }
};

function parseXYZ (x, y, z) {
    if (typeof x === 'object' && Array.isArray(x)) {
        return { x: x[0], y: x[1], z: x[2] };
    }
    else if (typeof x === 'object') {
        return { x: x.x || 0, y: x.y || 0, z: x.z || 0 };
    }
    return { x: Number(x), y: Number(y), z: Number(z) };
}
