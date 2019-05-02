import { Tool, MAP_LENGTH, ANMI_TIME, GemType } from './Tool';
import { Gem } from './Gem';

const {ccclass, property} = cc._decorator;

/**游戏控制器 */
@ccclass
export class Game extends cc.Component {
       
    private static instance: Game = null;
    /**描述标签 */
    @property(cc.Label)
    labe: cc.Label;
    /**当前分数 */
    currScore = 0;

    /**宝石根对象 */
    @property(cc.Node)
    gemRoot: cc.Node;
    /**所有宝石 */
    gemList: Gem[][] = [];
    /**第一个选择的宝石 */
    selectedGem1: Gem;
    /**第二个选择的宝石 */
    selectedGem2: Gem;

    @property(cc.Prefab)
    selectedPrefab: cc.Prefab;
    /**选中效果框 */
    selectedNode: cc.Node;
    /**是否可点击(留着以后有全图特效再用）) */
    canClick: boolean = true;

    /**宝石缓存池 */
    gemPool: cc.NodePool;

    static getInstance(): Game {
        return this.instance;
    }

    onLoad() {
        Game.instance = this;
        cc.game.addPersistRootNode(this.node);

        let self = this;
        //初始化选中框
        this.selectedNode = cc.instantiate(this.selectedPrefab);
        //初始化宝石阵
        this.initMap();
        //键盘测试
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, function(event: cc.Event.EventKeyboard){
            switch(event.keyCode) {
                case cc.macro.KEY.q:
                self.debugGemList();
                break;
                case cc.macro.KEY.w:
                self.trimMap();
                break;
                case cc.macro.KEY.e:
                self.tripMapFinished();
                break;
                case cc.macro.KEY.r:
                self.judgeIsDieMap();
                break;
            }
        }, this);
    }

    onDestroy() {
        Game.instance = null;
    }

    debugGemList() {
        console.log('缓存数量=' + this.gemPool.size());
        console.log('当前选择=' + (this.selectedGem1 ? this.selectedGem1.toString() : '') + ',' + (this.selectedGem2 ? this.selectedGem2.toString() : ''));
        for (let y = MAP_LENGTH - 1; y >= 0; y--) {
            let str = '';
            for (let x = 0; x < MAP_LENGTH; x++) {
                str += this.gemList[x][y];
            }
            console.log(str);
        }
    }

    initMap() {
        let self = this;
        cc.loader.loadRes("prefab/Gem", cc.Prefab, function(err: Error, prefab: cc.Node) {
            //初始化缓存池
            self.gemPool = new cc.NodePool();
            let poolSize = MAP_LENGTH * MAP_LENGTH;
            for (let i = 0; i < poolSize; i++) {
                let gem = cc.instantiate(prefab);
                self.gemPool.put(gem);
                self.node.active = false;
            }
            //初始化宝石矩阵
            self.initGemAll();
        });
    }

    /**初始化宝石矩阵 */
    initGemAll() {
        //随机一个宝石阵
        for (let x = 0; x < MAP_LENGTH; x++) {
            this.gemList[x] = [];
            for (let y = 0; y < MAP_LENGTH; y++) {
                this.initGemOne(x, y);
            }
        }
        //有可消除宝石则换一个类型再检测
        let haveRemove = false;
        let count = 0;
        do {
            count++;
            haveRemove = false;
            for (let i = 0; i < MAP_LENGTH; i++) {
                let gem = this.gemList[i][i];
                let removeList = gem.getRemoveList();
                if (removeList.length > 0) {
                    haveRemove = true;
                    let gemRemove = removeList[0];
                    gemRemove.randemOtherType();
                }
            }
        } while (haveRemove)
        console.log('初始地图调整次数=' + count);
    }

    /**初始化一个宝石 */
    initGemOne(x:number, y: number, type: GemType = Tool.randomGem()): Gem {
        //新建并设置根对象
        let obj = this.gemPool.get();
        obj.setParent(this.gemRoot);
        //暂时：防止提示特效中断
        obj.scale = 1;
        //初始化类型和位置
        let scr = obj.getComponent(Gem);
        //这里必须先设置位置然后随机类型，否则会影响是否是新宝石的判断
        scr.updateGem(x, y, false);
        scr.updateColor(type);
        //显示并返回
        obj.active = true;
        return scr;
    }

    /**消除一个宝石 */
    removeGemOne(gem: Gem) {
        this.gemList[gem.x][gem.y] = null;
        this.gemPool.put(gem.node);
        gem.reset();
        gem.node.active = false;

        this.currScore += 10;
        this.labe.string = '分数：' + this.currScore.toString();
        let action1 = cc.scaleTo(0.1, this.labe.node.scale * 1.5);
        let action2 = cc.scaleTo(0.1, this.labe.node.scale * 1);
        let seq = cc.sequence(action1, action2);
        this.labe.node.runAction(seq);
    }

    /**点击宝石 */
    clickGem(gem: Gem) {
        if (this.canClick == false) {
            return;
        }

        //都选择后是动画时间，禁止再点击
        if (this.selectedGem1 != null && this.selectedGem2 != null) {
            return;
        }
        console.log('点击' + gem.toString());

        //选择第一个宝石
        if (this.selectedGem1 == null) {
            this.selectedGem1 = gem;
            this.selectedNode.setParent(this.selectedGem1.node);
            this.selectedNode.active = true;
        } 
        //选择第二个宝石
        else {
            if (this.selectedGem1 == gem) {
                return;
            }
            if (!this.selectedGem1.canChangePos(gem)) {
                this.cancelSelect();
                this.clickGem(gem);
                return;
            }
            if (gem.canClick() == false) {
                return;
            }
            this.selectedGem2 = gem;
            this.selectedNode.active = false;
            this.changeGem();
            //this.canClick = false;
        }
    }

    /**取消选择 */
    cancelSelect() {
        this.selectedGem1 = null;
        this.selectedGem2 = null;
        this.selectedNode.active = false;
    }
    
    /**交换选择的2个宝石 */
    changeGem() {
        let self = this;
        //交换宝石位置和索引
        self.selectedGem1.changePosAndIndex(self.selectedGem2);
         //获得可消除的宝石列表
         let removeList1 = self.selectedGem1.getRemoveList();
         let removeList2 = self.selectedGem2.getRemoveList();
         let removeList = removeList1.concat(removeList2);
         removeList = Tool.removeRepeat(removeList);

        //交换动画结束后
        self.scheduleOnce(function() {      
            //没有可消除宝石则再换回去
            if (removeList.length == 0) {
                self.selectedGem1.changePosAndIndex(self.selectedGem2);
                this.canClick = true;
            } 
            //有的话
            else {
                //消除宝石
                console.log('消除宝石=' + removeList);
                removeList.forEach(element => {
                    self.removeGemOne(element);
                });
                //整理地图
                self.trimMap();
            }

            //取消选择
            self.cancelSelect();
        }, ANMI_TIME + 0.1);
    }

    /**整理地图 */
    trimMap() {
        this.unschedule(this.judgeIsDieMap);

        this.gemList.forEach((listH, x) => {
            //检测有几个空的
            let nullCount = 0;
            //只遍历到边界，再高都是临时宝石，不用统计空！
            for (let i = 0; i < MAP_LENGTH; i++) {
                if (listH[i] == null) {
                    nullCount++;
                }
            }

            if (nullCount > 0) {
                //补上新的
                for (let y = 0; y < nullCount; y++) {
                    this.initGemOne(x, y + MAP_LENGTH);
                }
                //去掉空行
                this.trimMapX(x);
            }
        });
        //再次检测
        this.unschedule(this.tripMapFinished);
        this.scheduleOnce(this.tripMapFinished, ANMI_TIME + 0.5);
    }
    
    /**整理地图后再检测一下是否有新的消除项 */
    tripMapFinished() {
        //检测是否有消除
        let haveRemove = false;
        let removeList: Gem[] = [];
        for (let i = 0; i < MAP_LENGTH; i++) {
            let gem = this.gemList[i][i];
            let rList = gem.getRemoveList();
            if (rList.length > 0) {
                haveRemove = true;
                removeList = removeList.concat(rList);
            }
        }
        //消除
        removeList = Tool.removeRepeat(removeList);
        removeList.forEach(element => {
            this.removeGemOne(element);
        });
        console.log('再次检测=' + haveRemove + ',' + removeList.length);
        //如果有可消除项则再整理一次地图
        if (haveRemove) {
            this.unschedule(this.trimMap);
            this.scheduleOnce(this.trimMap, 0.1);
        }
        //没有的话则判断一下是否是死图
        else {
            //没有可消除项则恢复点击
            //this.canClick = true;
            //10秒后检测是否是死图
            this.scheduleOnce(this.judgeIsDieMap, 5);
        }
    }

    /**判断是否是死图 */
    judgeIsDieMap() {
        let gem = this.NotDieMap();
        if (!gem) {
            //是死图则游戏结束
            this.labe.string = "游戏结束：" + this.currScore;
            this.labe.node.color = cc.Color.RED;       
        } else {
            //不是死图则给出提示
            let action1 = cc.scaleTo(0.2, 0.5);
            let action2 = cc.scaleTo(0.2, 1);
            let seq = cc.sequence(action1, action2);
            gem.node.runAction(seq);
        }
    }

    /**整理地图（竖行） */
    trimMapX(x: number) {
        let arr = this.gemList[x];
        //记录该宝石下面有多少空位置，然后统一下滑
        let nullCount = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] == null) {
                nullCount++;
            } else {
                arr[i].updateGemSetOriginNull(x, i - nullCount);
            }
        }
    }

    /**是否是死图 */
    NotDieMap(): Gem {
        let goodGem = null;
        for (let i = 0; i < MAP_LENGTH; i++) {
            for (let j = 0; j < MAP_LENGTH; j++) {
                let gem = this.gemList[i][j];
                if (gem == null) {
                    console.log('应该是动画未完成前点快了会出现，不影响后续...');
                    continue;
                }
                let moveGem = gem.havePosibleRemove();         
                if (moveGem) {
                    goodGem = moveGem;
                    break;
                }
            }
        }
        console.log('是否是死图=' + goodGem)
        return goodGem;
    }

    /**根据索引获得宝石 */
    getGemByIndex(x: number, y: number): Gem {
        let min = 0;
        let max = MAP_LENGTH - 1;
        x = Tool.clamp(x, min, max);
        y = Tool.clamp(y, min, max);
        return this.gemList[x][y];
    }
}