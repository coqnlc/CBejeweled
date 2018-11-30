import { Tool, GemType, MAP_LENGTH, ANMI_TIME } from './Tool';
import { Game } from './Game';

const {ccclass, property} = cc._decorator;

/**宝石类 */
@ccclass
export class Gem extends cc.Component {
    /**本身按钮 */
    @property(cc.Button)
    button: cc.Button;
    /**宝石类型 */
    gemType: GemType = GemType.None;
    /**x坐标 */
    x: number = 0;
    /**y坐标 */
    y: number = 0;

    start() {
        //滑动操作
        this.node.on(cc.Node.EventType.TOUCH_START, function(){
            Game.getInstance().clickGem(this);
        }, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, function(event: cc.Event.EventTouch){
            this.judgeTouchDir(event);
        }, this);
    }

    /**重置宝石 */
    reset() {
        this.updateColor(GemType.None);
        this.updatePos(0, 0, false);
    }

    /**该宝石是否可点击(待做：改成宝石缓存新位置，等动画结束后再更新) */
    canClick(): boolean {
        let list = Game.getInstance().gemList[this.x];
        for (let i = 0; i < this.x; i++) {
            if (list[i] == null) {
                return false;
            }
        }
        return true;
    }

    /**判断触控方向 */
    judgeTouchDir(event: cc.Event.EventTouch) {
        let delta = event.getLocation().subSelf(event.getStartLocation());
        //至少超过这个距离才会有效
        let len = 30;
        if (Math.abs(delta.x) < len && Math.abs(delta.y) < len) {
            return;
        }
        console.log('touch=' + delta);
        let game = Game.getInstance();
        let gem: Gem = null;
        if (Math.abs(delta.x) > Math.abs(delta.y)) {
            if (delta.x > 0) gem = game.getGemByIndex(this.x + 1, this.y);
            else gem = game.getGemByIndex(this.x - 1, this.y);
        } else {
            if (delta.y > 0) gem = game.getGemByIndex(this.x, this.y + 1);
            else gem = game.getGemByIndex(this.x, this.y - 1);
        }
        game.clickGem(gem);
    }

    /**更新颜色 */
    updateColor(gemType: GemType) {
        this.gemType = gemType;
        let nodeColor = cc.Color.BLACK;
        switch (this.gemType) {
            case GemType.RedGem: nodeColor = cc.Color.RED;          break;
            case GemType.GreenGem: nodeColor = cc.Color.GREEN;      break;
            case GemType.MagentaGem: nodeColor = cc.Color.MAGENTA;  break;
            case GemType.BlueGem: nodeColor = cc.Color.BLUE;        break;
            case GemType.WhiteGem: nodeColor = cc.Color.WHITE;      break;
            case GemType.YellowGem: nodeColor = cc.Color.YELLOW;    break;
            case GemType.OrangeGem: nodeColor = cc.Color.ORANGE;    break;
            case GemType.WhiteGem: nodeColor = cc.Color.WHITE;      break;
        }
        this.node.color = nodeColor;
    }

    /**更新位置 */
    updatePos(x: number, y: number, haveAnim: boolean = true) {
        this.x = x;
        this.y = y;
        //this.label.string = this.toString();

        //宝石间隔（demo1.1好看，但是间隙点不到，正式版换透明图1刚刚好，能点到又看着有间隔）
        let extra = 1.1;
        //根据索引设置位置
        let pos = cc.v2(this.x * this.node.width * extra, this.y * this.node.height * extra);
        //居中
        let max = MAP_LENGTH - 1;
        pos.subSelf(cc.v2(this.node.width * max * 0.5 * extra, this.node.height * max * 0.5 * extra));
        //移动
        if (haveAnim) {
            let action = cc.moveTo(ANMI_TIME, pos);
            this.node.runAction(action);
        } else {
            this.node.stopAllActions();
            this.node.position = pos;
        }
    }

    /**位置是否可以和对应宝石交换位置 */
    canChangePos(gem: Gem): boolean {
        if (this.x == gem.x && Math.abs(this.y - gem.y) == 1)
            return true;
        if (this.y == gem.y && Math.abs(this.x - gem.x) == 1)
            return true;
        return false;
    }

    /**随机一个其他类型 */
    randemOtherType() {
        let newType = Tool.randomGemExcept(this.gemType);
        this.updateColor(newType);
    }

    toString() {
        let str = this.x + ',' + this.y;
        return Tool.formatStr(str);
    }

    /**交换宝石 */
    changePosAndIndex(gem: Gem) {
        let tempX = this.x;
        let tempY = this.y;
        this.updateGem(gem.x, gem.y);
        gem.updateGem(tempX, tempY);
    }

    /**更新宝石（索引和位置，原列表位置清除） */
    updateGemSetOriginNull(x: number, y: number, haveAnim: boolean = true) {
        let arr = Game.getInstance().gemList[this.x];
        arr[this.y] = null;

        this.updateGem(x, y, haveAnim);
    }

    /**更新宝石（索引和位置） */
    updateGem(x: number, y: number, haveAnim: boolean = true) {
        this.updatePos(x, y, haveAnim);
        Game.getInstance().gemList[x][y] = this;
    }

    /**获得该宝石周围可消除的宝石列表 */
    getRemoveList(): Gem[] {
        let removeList: Gem[];
        let gemList = Game.getInstance().gemList;

        //纵向检测
        let yList = gemList[this.x];
        let yRemoveList = this.getRemoveListFromDir(yList);
        //横向检测
        let xList: Gem[] = [];
        for (let i = 0; i < gemList.length; i++) {
            xList.push(gemList[i][this.y]);
        }
        let xRemoveList = this.getRemoveListFromDir(xList);

        removeList = yRemoveList.concat(xRemoveList);
        removeList = Tool.removeRepeat(removeList);
        return removeList;
    }

    /**从原始列表中获得可消除列表 */
    getRemoveListFromDir(originList: Gem[]): Gem[] {
        let removeList: Gem[] = [];
        if (originList.length < 3) {
            removeList; 
        }

        removeList.push(originList[0]);
        //超过8边界的就不用处理了，因为都是归位后的宝石才检测可消除
        for (let i = 1; i < MAP_LENGTH; i++) {
            if (originList[i] == null || originList[i - 1] == null) {
                console.log('宝石列表有空---------->'+ originList);
                continue;
            }
            if (originList[i].gemType == originList[i - 1].gemType) {
                //第一次比对要把左边的元素也记下来
                if (removeList.length == 0) {
                    removeList.push(originList[i - 1]);
                }
                removeList.push(originList[i]);
            } else {
                //不同的话，如果已经大于3了则保留
                if (removeList.length >= 3) {
                    break;
                } else {
                    removeList = [];
                }
            }
        }
        //防止最后2个一样通过检测！！！
        if (removeList.length < 3) {
            removeList = [];
        }

        return removeList;
    }

    /**是否有可能和别人宝石消除 */
    havePosibleRemove(): Gem {
        //上
        let gemUp = this.getUp();
        if (this.SameType(gemUp)) {
            if (this.SameType(gemUp.getLeftUp())) {
                return gemUp.getLeftUp();
            } else if (this.SameType(gemUp.getRightUp())) {
                return gemUp.getRightUp();
            } else if (this.SameType(this.getLeftDown())) {
                return this.getLeftDown();
            } else if (this.SameType(this.getRightDown())) {
                return this.getRightDown();
            }

            let gemUp2 = gemUp.getUp();
            if (gemUp2 && this.SameType(gemUp2.getUp())) {
                return gemUp2.getUp();
            }
        }
        //下
        let gemDown = this.getDown();
        if (this.SameType(gemDown)) {
            if (this.SameType(this.getLeftUp())) {
                return this.getLeftUp();
            } else if (this.SameType(this.getRightUp())) {
                return this.getRightUp();
            } else if (this.SameType(gemDown.getLeftDown())) {
                return gemDown.getLeftDown();
            } else if (this.SameType(gemDown.getRightDown())) {
                return gemDown.getRightDown();
            } 

            let gemDown2 = gemDown.getDown();
            if (gemDown2 && this.SameType(gemDown2.getDown())) {
                return gemDown2.getDown();
            }
        }
        //左
        let gemLeft = this.getLeft();
        if (this.SameType(gemLeft)) {
            if (this.SameType(gemLeft.getLeftUp())) {
                return gemLeft.getLeftUp();
            } else if (this.SameType(gemLeft.getLeftDown())) {
                return gemLeft.getLeftDown();
            } else if (this.SameType(this.getRightUp())) {
                return this.getRightUp();
            } else if (this.SameType(this.getRightDown())) 
                return this.getRightDown();

            let gemLeft2 = gemLeft.getLeft();
            if (gemLeft2 && this.SameType(gemLeft2.getLeft())) {
                return gemLeft2.getLeft();
            }
        }
        //右
        let gemRight = this.getRight();
        if (this.SameType(gemRight)) {
            if (this.SameType(this.getLeftUp())) {
                return this.getLeftUp();
            } else if (this.SameType(this.getLeftDown())) {
                return this.getLeftDown();
            } else if (this.SameType(gemRight.getRightUp())) {
                return gemRight.getRightUp();
            } else if (this.SameType(gemRight.getRightDown())) {
                return gemRight.getRightDown();
            } 

            let gemRight2 = gemRight.getRight();
            if (gemRight2 && this.SameType(gemRight2.getRight())) {
                return gemRight2.getRight();
            }
        }
        //左上右上
        if (this.SameType(this.getLeftUp()) && this.SameType(this.getRightUp())) 
            return this;
        //右上右下
        if (this.SameType(this.getRightUp()) && this.SameType(this.getRightDown())) 
            return this;
        //右下左下
        if (this.SameType(this.getRightDown()) && this.SameType(this.getLeftDown()))
            return this;
        //左下左上
        if (this.SameType(this.getLeftDown()) && this.SameType(this.getLeftUp()))
            return this;

        return null;
    }

    /**是否是相同的类型 */
    SameType(gem: Gem): boolean {
        if (!gem) {
            return false;
        }
        return this.gemType == gem.gemType;
    }

    getUp(): Gem {
        let gemList = Game.getInstance().gemList;
        if (this.y >= MAP_LENGTH - 1) {
            return null;
        } else {
            return gemList[this.x][this.y + 1];
        }
    }

    getDown(): Gem {
        let gemList = Game.getInstance().gemList;
        if (this.y <= 0) {
            return null;
        } else {
            return gemList[this.x][this.y - 1];
        }
    }

    getLeft(): Gem {
        let gemList = Game.getInstance().gemList;
        if (this.x <= 0) {
            return null;
        } else {
            return gemList[this.x - 1][this.y];
        }
    }

    getRight(): Gem {
        let gemList = Game.getInstance().gemList;
        if (this.x >= MAP_LENGTH - 1) {
            return null;
        } else {
            return gemList[this.x + 1][this.y];
        }
    }

    getLeftUp(): Gem {
        let left = this.getLeft();
        if (left == null) {
            return null;
        } else {
            return left.getUp();
        }
    }

    getRightUp(): Gem {
        let right = this.getRight();
        if (right == null) {
            return null;
        } else {
            return right.getUp();
        }
    }

    getLeftDown(): Gem {
        let left = this.getLeft();
        if (left == null) {
            return null;
        } else {
            return left.getDown();
        }
    }

    getRightDown(): Gem {
        let right = this.getRight();
        if (right == null) {
            return null;
        } else {
            return right.getDown();
        }
    }
    
}