import { getAvatar } from '../modules/Avatar';

class UserClass{
    constructor(id,uid,face,lv,live_lv,live_rank){
        this.id = id;
        this.uid = uid;
        this.face = face;
        this.lv = lv;
        this.live_lv = live_lv;
        this.live_rank = live_rank;
        //获取头像，异步获取头像链接
    }
    getID(){ return this.id; }
    getUid(){ return this.uid; }
    getFaceUrl(){ return this.face; }
}

export const User = (id,uid,face,lv,live_lv,live_rank) => new Promise( async reslove => {
    if(face){
        reslove(new UserClass(id,uid,face,lv,live_lv,live_rank));
    }else{
        const avatars = await getAvatar(uid);
        reslove(new UserClass(id,uid,avatars,lv,live_lv,live_rank));
    }
});

export class Medal{
    constructor(lv,medal_name,up_name,up_uid){
        this.lv = lv || 0; 
        this.medal_name = medal_name || '';
        this.up_name = up_name || '';
        this.up_uid = up_uid || '';
    }

    getLv(){ return this.lv; }
    getName(){ return this.medal_name; }
    getUname(){ return this.up_name; }
    getUid(){ return this.up_uid; }
}