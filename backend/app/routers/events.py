"""行为事件路由——用户互动（喜欢/收藏/点赞/差评）写入数据库"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ClickEvent, Movie
from app.routers.auth import get_current_user
from app.schemas import EventCreate, MyEventsOut
from app.models import User

router = APIRouter(prefix="/api/events", tags=["events"])

# 每种互动对最终星数的贡献（与前端保持一致）
ACTION_DELTA = {
    "like": 1.0,       # 喜欢：一次，可取消
    "fav": 0.5,        # 收藏：一次，可取消
    "thumbs_up": 0.5,  # 点赞：可累积多次
    "bad": -0.5,       # 差评：可累积多次
}


@router.post("", status_code=201)
def create_event(
    data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 需要登录！
):
    """记录一次互动事件。like/fav 重复记录会幂等覆盖（数据库约束），thumbs_up/bad 每次+1条"""
    if data.action not in ACTION_DELTA:
        raise HTTPException(status_code=400, detail=f"未知动作: {data.action}，可选 {list(ACTION_DELTA)}")
    if db.get(Movie, data.movie_id) is None:
        raise HTTPException(status_code=404, detail="电影不存在")

    if data.action in ("like", "fav"):
        # 喜欢/收藏：先删旧的再插入（toggle 语义：同一电影同一动作只有一条）
        db.execute(delete(ClickEvent).where(
            ClickEvent.user_id == current_user.id,
            ClickEvent.movie_id == data.movie_id,
            ClickEvent.action == data.action,
        ))

    db.add(ClickEvent(
        user_id=current_user.id,
        movie_id=data.movie_id,
        action=data.action,
        delta=ACTION_DELTA[data.action],
    ))
    db.commit()
    return {"status": "ok", "action": data.action, "delta": ACTION_DELTA[data.action]}


@router.delete("/{movie_id}", status_code=200)
def delete_events(
    movie_id: int,
    action: str = Query(..., description="要取消的动作"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取消互动：like/fav 取消单条；thumbs_up/bad 归零（删全部该动作）"""
    deleted = db.execute(delete(ClickEvent).where(
        ClickEvent.user_id == current_user.id,
        ClickEvent.movie_id == movie_id,
        ClickEvent.action == action,
    )).rowcount
    db.commit()
    return {"status": "ok", "deleted": deleted}


@router.get("/my", response_model=MyEventsOut)
def my_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """我的互动汇总：{movie_id: {action: 次数}}——前端刷新后恢复状态用"""
    rows = db.execute(
        select(ClickEvent.movie_id, ClickEvent.action).where(
            ClickEvent.user_id == current_user.id
        )
    ).all()

    events: dict[int, dict[str, int]] = {}
    for movie_id, action in rows:
        events.setdefault(movie_id, {}).setdefault(action, 0)
        events[movie_id][action] += 1
    return MyEventsOut(events=events)
