// 게임의 전체 상태를 관리하고 업데이트합니다.

import { Player, Enemy, BoatState, Projectile } from './entities.js';
import { Progression } from './progression.js';
import { Vec2 } from './math.js';
import { AudioSys } from './audio.js';

export class Game {
    constructor(width, height, progression) {
        this.width = width;
        this.height = height;
        this.progression = progression;
        
        // 플레이어를 화면 중앙에 스폰
        this.player = new Player(width / 2, height / 2);
        
        this.enemies = [];
        this.particles = [];
        this.projectiles = [];
        this.spawnTimer = 3.0; // 첫 적 생성 시간 지연
        this.baseSpawnRate = 4.0; // 기본 스폰 주기 증가 (적 수 감소)
        this.onShake = null; // 렌더러에 흔들림 트리거용 콜백
    }

    createWake(boat) {
        // 배가 움직일 때 뒤로 물결 파티클 생성
        if (boat.vel.magSq() > 50) { // 속도 임계값 낮춤
            const backVec = boat.getForwardVec().scale(-1);
            // 뱃미 위치
            const sternX = boat.pos.x + backVec.x * (boat.height/2 - 5);
            const sternY = boat.pos.y + backVec.y * (boat.height/2 - 5);
            
            // 양쪽으로 퍼지는 물결
            const rightVec = boat.getRightVec();
            
            // 왼쪽 물결
            this.particles.push({
                x: sternX - rightVec.x * 8 + (Math.random() - 0.5) * 5,
                y: sternY - rightVec.y * 8 + (Math.random() - 0.5) * 5,
                size: Math.random() * 3 + 2,
                life: 1.2,
                maxLife: 1.2
            });
            
            // 오른쪽 물결
            this.particles.push({
                x: sternX + rightVec.x * 8 + (Math.random() - 0.5) * 5,
                y: sternY + rightVec.y * 8 + (Math.random() - 0.5) * 5,
                size: Math.random() * 3 + 2,
                life: 1.2,
                maxLife: 1.2
            });
        }

        // 플레이어가 노를 젓고 있을 때 노 끝에 작은 물결 생성
        if (boat instanceof Player && boat.isRowingActive) {
            if (boat.oarBladePos) {
                this.particles.push({
                    x: boat.oarBladePos.x + (Math.random() - 0.5) * 4,
                    y: boat.oarBladePos.y + (Math.random() - 0.5) * 4,
                    size: Math.random() * 2 + 1,
                    life: 0.8,
                    maxLife: 0.8
                });
            }
            if (boat.oarBladePos2) {
                this.particles.push({
                    x: boat.oarBladePos2.x + (Math.random() - 0.5) * 4,
                    y: boat.oarBladePos2.y + (Math.random() - 0.5) * 4,
                    size: Math.random() * 2 + 1,
                    life: 0.8,
                    maxLife: 0.8
                });
            }
        }
    }

    triggerWavePulse(pos) {
        // 주변 적들에게 강력한 넉백과 기절 적용
        for (const enemy of this.enemies) {
            const dist = enemy.pos.sub(pos).mag();
            if (dist < 150) { // 파동 반경 150
                const dir = enemy.pos.sub(pos).normalize();
                enemy.applyForce(dir.scale(800));
                enemy.stunTimer = 2.0;
                enemy.aiState = 'stunned';
                enemy.currentSlash = null;
            }
        }
        
        // 화면 흔들림
        if(this.onShake) this.onShake(30, 0.5);
    }

    update(dt, inputManager) {
        // 플레이어 업데이트
        this.player.update(dt, inputManager, this.width, this.height);
        this.createWake(this.player);

        // 파티클 업데이트
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 투사체 업데이트 및 충돌 판정
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.update(dt);
            
            if (proj.life <= 0) {
                this.projectiles.splice(i, 1);
                continue;
            }

            if (proj.isEnemy) {
                // 플레이어와 충돌
                if (Vec2.distance(proj.pos, this.player.pos) < this.player.width / 2 + proj.radius) {
                    if (this.player.state === BoatState.BLOCKING && this.player.parryTimer > 0) {
                        // 패링 성공: 투사체 반사
                        if(this.onShake) this.onShake(5, 0.1);
                        AudioSys.play('parry');
                        proj.isEnemy = false;
                        proj.vel = proj.vel.scale(-1.5); // 더 빠르게 반사
                        proj.life = 3.0;
                    } else {
                        // 피격
                        if(this.onShake) this.onShake(10, 0.2);
                        this.player.color = '#ff0000';
                        setTimeout(() => this.player.color = '#3b8b5a', 100);
                        this.player.hp -= proj.damage;
                        this.projectiles.splice(i, 1);
                        
                        if (this.player.hp <= 0) {
                            if (this.onGameOver) this.onGameOver();
                        }
                    }
                }
            } else {
                // 적과 충돌 (반사된 투사체)
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    if (Vec2.distance(proj.pos, enemy.pos) < enemy.width / 2 + proj.radius) {
                        enemy.hp -= proj.damage * 2; // 반사 데미지 2배
                        this.projectiles.splice(i, 1);
                        if (enemy.hp <= 0) {
                            this.enemies.splice(j, 1);
                            this.progression.addXp(enemy.xpValue || 1, this.player);
                        }
                        break;
                    }
                }
            }
        }

        // 레벨이 오를수록 스폰 주기 감소 (더 어려워짐)
        const currentSpawnRate = Math.max(0.5, this.baseSpawnRate - (this.progression.level * 0.2));
        this.spawnTimer -= dt;
        
        // 적 수 제한 (기본 10마리 + 레벨당 2마리)
        const maxEnemies = 10 + this.progression.level * 2;
        
        if (this.spawnTimer <= 0) {
            if (this.enemies.length < maxEnemies) {
                this.spawnEnemy();
            }
            this.spawnTimer = currentSpawnRate;
        }

        // 적 업데이트 및 충돌(공격) 판정
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // 원거리 적 투사체 발사 콜백
            enemy.onFireProjectile = (x, y, dir, speed, damage) => {
                this.projectiles.push(new Projectile(x, y, dir, speed, damage, true));
            };
            
            enemy.updateAI(dt, this.player, this.width, this.height);

            // 1. 플레이어의 공격에 적이 맞았는지 확인
            if (this.player.currentSlash && this.player.slashTimer > this.player.SLASH_COOLDOWN - this.player.SLASH_DURATION - 0.05) {
                if (this.player.currentSlash.contains(enemy.pos, enemy.width/2)) {
                    // 적 타격 이펙트 (화면 흔들림)
                    if(this.onShake) this.onShake(5, 0.15);

                    // 적 넉백
                    const knockbackDir = enemy.pos.sub(this.player.pos).normalize();
                    enemy.applyForce(knockbackDir.scale(500));
                    enemy.hp -= 1;
                    
                    if (enemy.hp <= 0) {
                        this.enemies.splice(i, 1);
                        // 적 처치 시 경험치 획득
                        this.progression.addXp(enemy.xpValue || 1, this.player);
                        continue;
                    }
                }
            }

            // 2. 적의 공격에 플레이어가 맞았는지 확인 (패링 포함)
            if (enemy.currentSlash && enemy.slashTimer > enemy.SLASH_DURATION - 0.05) {
                if (enemy.currentSlash.contains(this.player.pos, this.player.width/2)) {
                    // 플레이어 피격 처리
                    if (this.player.state === BoatState.BLOCKING && this.player.parryTimer > 0) {
                        // 패링(Perfect Parry) 성공
                        if(this.onShake) this.onShake(8, 0.2); // 패링 성공 시 약간 흔들림
                        AudioSys.play('parry');
                        
                        const pushDir = this.player.pos.sub(enemy.pos).normalize();
                        this.player.applyForce(pushDir.scale(300));
                        
                        // 패링 로직: 적을 기절(Stun)시킴
                        enemy.stunTimer = 1.5;
                        enemy.aiState = 'stunned';
                        enemy.currentSlash = null; // 적 공격 취소
                        enemy.slashTimer = 0;
                        
                        // 아이템 효과 연동 (파도 생성기)
                        if (this.player.hasWaveMaker) {
                            this.triggerWavePulse(this.player.pos);
                        }
                        
                    } else {
                        // 실제 피격
                        if(this.onShake) this.onShake(12, 0.3); // 맞으면 화면 흔들림
                        
                        this.player.color = '#ff0000'; // 임시 피격 표시
                        setTimeout(() => this.player.color = '#3b8b5a', 100);
                        const pushDir = this.player.pos.sub(enemy.pos).normalize();
                        // 아이템: 견고한 선체 적용 시 넉백 반감
                        const kbResist = this.player.knockbackResistance || 1.0;
                        this.player.applyForce(pushDir.scale(200 * kbResist)); // 적 넉백 감소
                        
                        this.player.hp -= 1;
                        enemy.currentSlash = null; // 다단히트 방지
                        enemy.slashTimer = 0;

                        if (this.player.hp <= 0) {
                            // 게임 오버 처리
                            if (this.onGameOver) this.onGameOver();
                        }
                        
                        // 아이템: 크라켄 먹물
                        if (this.player.hasKrakenInk) {
                            enemy.stunTimer = 2.0; // 적 기절
                        }
                    }
                }
            }
        }

        // 바운더리 처리
        this.constrainPlayer();
    }

    spawnEnemy() {
        // 화면 테두리 근처에서 스폰
        const padding = 50;
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? padding : this.width - padding;
            y = Math.random() * this.height;
        } else {
            x = Math.random() * this.width;
            y = Math.random() < 0.5 ? padding : this.height - padding;
        }
        
        // 레벨에 따라 다양한 적 스폰
        let type = 'normal';
        const rand = Math.random();
        const level = this.progression.level;
        
        if (level >= 2 && rand < 0.2) {
            type = 'ranged';
        } else if (level >= 2 && rand < 0.4) {
            type = 'swarm';
        } else if (level >= 4 && rand > 0.8) {
            type = 'tank';
        }
        
        this.enemies.push(new Enemy(x, y, type));
    }

    constrainPlayer() {
        const p = this.player.pos;
        const padding = 60; // 마진 증가
        if (p.x < padding) p.x = padding;
        if (p.x > this.width - padding) p.x = this.width - padding;
        if (p.y < padding) p.y = padding;
        if (p.y > this.height - padding) p.y = this.height - padding;
    }
}
