const {ccclass, property} = cc._decorator;

/**宝石长宽度 */
export const MAP_LENGTH: number = 8;
/**动画时间 */
export const ANMI_TIME: number = 0.2;

/**工具类 */
@ccclass
export class Tool
{
    /**范围内获得随机整数 */
    static getRandomInt(min: number, max: number) :number {
        var range = max - min;
        var rand = Math.random();
        return (min + Math.round(rand * range));
    }

    /**获得一个随机宝石类型（除这个类型之外的随机） */
    static randomGemExcept(exceptType: GemType) {
        let random = Tool.randomGem();
        while (random == exceptType) {
            random = Tool.randomGem();
        }
        return random;
    }

    /**获得一个随机宝石类型 */
    static randomGem(): GemType {
        let random = Tool.getRandomInt(1, 7);
        let type = random as GemType;
        return type;
    }

    /**数组去重 */
    static removeRepeat<T>(arr: T[]): T[] {
        if (arr == null) {
            console.log('数组去重异常：空数组');
            return null;
        }
        let res = arr.filter(function(element, index, self){
            return self.indexOf(element) == index;
        });
        return res;
    }

    /**用方括号格式化字符串 */
    static formatStr(str: string): string {
        return '[' + str + ']';
    }

    /**把数字限定在一定范围内 */
    static clamp(num: number, min: number, max: number): number {
        if (num < min) {
            num = min;
        } else if (num > max) {
            num = max;
        }
        return num;
    }
}

/**宝石类型 */
export enum GemType {
    None = 0,
    RedGem = 1,
    GreenGem = 2,
    MagentaGem = 3,
    BlueGem = 4,
    WhiteGem = 5,
    YellowGem = 6,
    OrangeGem = 7,
}