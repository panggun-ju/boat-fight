export const AudioSys = {
    enabled: false,
    bgm: new Audio('assets/bgm.mp3'),
    sounds: {
        player_sword: new Audio('assets/player_sword.ogg'),
        enemy_sword: new Audio('assets/enemy_sword.ogg'),
        enemy_swarm_sword: new Audio('assets/enemy_swarm_sword.ogg'),
        enemy_tank_sword: new Audio('assets/enemy_tank_sword.ogg'),
        enemy_cannon: new Audio('assets/enemy_cannon.ogg'),
        parry: new Audio('assets/parry.ogg')
    },
    init() {
        this.bgm.loop = true;
        this.bgm.volume = 0.3;
    },
    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.bgm.play().catch(e=>console.log(e));
        } else {
            this.bgm.pause();
        }
        return this.enabled;
    },
    play(name) {
        if (!this.enabled || !this.sounds[name]) return;
        const s = this.sounds[name].cloneNode();
        s.volume = 0.5;
        s.play().catch(e=>console.log(e));
    }
};

AudioSys.init();