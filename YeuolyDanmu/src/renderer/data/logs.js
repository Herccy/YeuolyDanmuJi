import { global_settings } from '../settings/global_settings';
import Utils from '../class/Utils';
import { OrdinaryEventBus } from '../events/evnetBus';
import HashList from '../class/HashList';
//落魄到用日志文件来代替原本的礼物SC记录
const log = require('electron-log');
log.transports.console.level = false;
/**
 * 写着一段的时候我自己都很懵，大概思路，每次保存日志文件都是保存在下面这个鬼文件里，文件名为启动时间
 * 每次写入记录都是 【时间】+【类别】+【文本】这样的格式
 * 每次写入只写入新增记录，具体实现看底下叭，就算写的时候很懵很乱，这点逻辑应该还是很容易看懂的
 */
log.transports.file.file =  `${global_settings['log_module']['log_path']}records\\${Utils.formatDate(new Date(),'yyyy-MM-dd-hh')}.txt`;
log.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";

/**
 * 以下都是统计数据
 * 这里有个严肃的事情，如果要上统计模块就要计算大量md5，不计算更惨，造成了CPU占用率提升了个3%左右
 * 当流量大的时候最惨，所以准备加一个开关用来开关统计模块，这玩意真的太占资源了
 */
const daily_log_records = [];

const daily_gift_records = [];

const daily_sc_records = [];

const daily_danmu_records = [];

const daily_guard_records = [];

/**
 * 悲，由于我tm脑子有坑又加了一个互动过的dd，现在要加一个hash分表了，头像加载那边由于装载了以前
 * 的头像，用不了，需要单独加表，虽然理论上可以给那边加上一个互动过的属性，但这样就要每次启动都重置一下
 * 想来想去都觉得好麻烦，而且那边接过来也好麻烦，懒得改了，单独加表吧，反正hash也不难，
 * 不过想了想我还是加弄一个类来处理hash好了，不然显得太臃肿了。
 */
const statistics = {
    total_price : 0,
    au_price : 0,
    ag_price : 0,
    danmu_count : 0,
    interactional_dd_count : 0,
    paied_dd_count : 0,
    total_sc_price : 0,
    total_guard_price : 0,
    total_guard_count : 0,
    danmu_speeds : {  
        value : [ 0 ],
        date : [ Utils.formatDate(new Date(),'hh:mm:ss') ]
    },
    danmu_speed_cache : {
        accumulate_time : 0,
        accumulate_count : 0
    },
    //这个是为后续统计做的，但考虑到现在的CPU已经挺蛋疼了，就暂时不做了
    gift_classfiy_count : []
};

//好了，开始处理hash，参加互动的dd数量级应该是10^3-10^4，用两层表够了，打钱的dd应该在10^2左右，一层表就行了
const interactional_dd_hash = new HashList(2);
const paied_dd_hash = new HashList(1);

let last_index_sc = 0;
let last_index_gift = 0;
let last_index_danmu = 0;

//更新互动DD
function updateInteractionalDD(id,uid){
    //一个临时变量，用来存hash
    let hash_c = null;
    //检测这个dd互动过没
    if(interactional_dd_hash.insert({
        uid : uid,  //UID
        id : id,    //ID
        times : 1           //互动次数
    },uid, hash => {
        //这个回调会优先调用
        hash_c = hash;
    }))
    {
        //如果没有互动过就互动++
        statistics.interactional_dd_count++;
    }else{
        //互动过就times++
        interactional_dd_hash.modify(hash_c, item => {
            item['times']++;
        });
    }
}
//更新打钱DD
function updatePaiedDD(id,uid,price){
    //一个临时变量，用来存hash
    let hash_c = null;
    //检测这个dd打过钱没
    if(true === paied_dd_hash.insert({
        uid : uid,              //UID
        id : id,                //ID
        price : price           //打钱总价值
    },uid, hash => {
        //这个回调会优先调用
        hash_c = hash;
    })){
        //如果没有打过钱，也就是插入成功，那就打钱++
        statistics.paied_dd_count++;
    }else{
        //打过钱那就price+
        paied_dd_hash.modify(hash_c, item => {
            item['price'] += price;
        });
    }
}

export function writeRecords(){
    //只要知道是在写日志就行了
    if(last_index_sc !== daily_sc_records.length)
        log.log(JSON.stringify(daily_sc_records.slice(last_index_sc)));
    if(last_index_gift !== daily_gift_records.length)
        log.log(JSON.stringify(daily_gift_records.slice(last_index_gift)));
    if(last_index_danmu !== daily_danmu_records.length)
        log.log(JSON.stringify(daily_danmu_records.slice(last_index_danmu)));
    last_index_gift = daily_gift_records.length;
    last_index_sc = daily_sc_records.length;
    last_index_danmu = daily_danmu_records.length;
}

//挂载速度事件
OrdinaryEventBus.$on('current-speed', v => {
    //我知道这里代码可读性跟屎一样，反正只要知道这是个算平均速度的就行了
    statistics.danmu_speed_cache.accumulate_time += v.time / 1000;
    statistics.danmu_speed_cache.accumulate_count += v.count;
    if(statistics.danmu_speed_cache.accumulate_time > 60){
        statistics.danmu_speeds.value.push(
            statistics.danmu_speed_cache.accumulate_count / statistics.danmu_speed_cache.accumulate_time
        );
        statistics.danmu_speeds.date.push(Utils.formatDate(new Date(),'hh:mm:ss'));
        delete statistics.danmu_speed_cache;
        statistics.danmu_speed_cache = { accumulate_count : 0, accumulate_time : 0 };
    }
});

export function getDailyGiftRecords(){
    return daily_gift_records.slice(0);
}
export function getDailyLogRecords(){
    return daily_log_records.slice(0);
}
export function getDailySCRecords(){
    return daily_sc_records.slice(0);
}
export function getInteractionalDDs(){
    return interactional_dd_hash.clone();
}
export function getPaiedDDs(){
    return paied_dd_hash.clone();
}
export function getDailyLogRecordsPointer(){
    return daily_log_records;
}
export function getDailyGiftRecordsPointer(){
    return daily_gift_records;
}
export function getDailySCRecordsPointer(){
    return daily_sc_records;
}
export function getDailyGuardRecordsPointer(){
    return daily_guard_records;
}
export function addDanmus(danmus){
    danmus.forEach( e => {
        statistics.danmu_count++;
        //更新互动
        updateInteractionalDD(e.user.id,e.user.uid);
        daily_danmu_records.push({ uid:e.user.uid, id:e.user.id, message:e.message });
    });
}
export function addLog(log){
    daily_log_records.push(log);
}
export function addGift(gf){
    //更新互动
    updateInteractionalDD(gf.user.id, gf.user.uid);
    //如果不是辣条那就是打了钱，然后就检测是否打过钱
    if(gf.gift_id !== 1){
        //更新打钱
        updatePaiedDD(gf.user.id, gf.user.uid, gf.gift_price);
        statistics.au_price += gf.gift_price;
    }else{
        statistics.ag_price += gf.gift_price;
    }
    statistics.total_price += gf.gift_price;
    daily_gift_records.push(gf);
}
export function addSC(sc){
    //更新打钱
    updatePaiedDD(sc.user.id,sc.user.uid,sc.price * 1000);
    //更新互动
    updateInteractionalDD(sc.user.id,sc.user.uid);
    statistics.total_sc_price += sc.price;
    daily_sc_records.push(sc);
}
export function addGuard(guard){
    //更新打钱
    updatePaiedDD(guard.user.id, guard.user.uid, guard.price);
    //更新互动
    updateInteractionalDD(guard.user.id, guard.user.uid);
    statistics.total_guard_price += guard.price;
    statistics.total_guard_count++;
    daily_guard_records.push(guard);
}
export function getStatisticPointer(){
    return statistics;
}