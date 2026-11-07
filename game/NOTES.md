# Cuộc Gọi Từ Campuchia: ghi chú game (bản point-and-click)

Bản chơi thử: https://call-from-cambodia.vercel.app/ (Vercel tự deploy mỗi khi push lên `main`, phục vụ thư mục `game/`).

Game là escape room góc nhìn thứ nhất. Người chơi click vào đồ vật để tương tác và click mũi tên đỏ để đổi góc nhìn. Toàn bộ art, UI và cutscene lấy từ `source/Game of Thiên Duyên` (thư mục này không đưa lên git vì nặng 1.2GB).

## Cấu trúc
- `index.html`, `style.css`, `game.js`: toàn bộ code, không cần build.
- `assets/v2/rooms/`: 14 góc nhìn, ảnh 1920x1080.
- `assets/v2/props/`: đồ vật đã tách nền, dùng khi phóng to đồ vật và trong ô đồ.
- `assets/v2/ui/`: menu, options, sound, tutorial, quit, pause, the end, khung thoại.
- `assets/v2/chars/`: Anh Đại, An Yên (hiện khi họ nói), Tí (chưa dùng vì góc nhìn thứ nhất).
- `assets/v2/video/`: cut1 (nhận nhiệm vụ), cut2 (bị chích điện), cut3 (giải cứu). Đã chuyển sang H.264 720p.
- `assets/v2/voice/`: 21 câu thoại có giọng, tạo bằng giọng Linh của macOS rồi đổi cao độ. Muốn thay bằng giọng thu âm thật thì giữ nguyên tên file.

## Bản đồ góc nhìn
```
office ─┬─ desk (sổ St5K) ── pc (folder hồ sơ: mật khẩu St5K, ra An Yên phòng 602)
        ├─ desk2 (máy người khác)
        ├─ corner (đồng hồ số 4, thùng rác số 20)
        └─↓ hallOffice ─← hall ─┬─ hallWater (ly số 2)
                                ├─ hallKPI (chữ K) ── cửa gỗ ── boss ─┬─ bossLeft
                                │                                      └─ bossRight (đầu nai, chùm chìa khóa)
                                └─ cellDoor (keypad 24K20) ── cells (cửa 602, chiếu cut3, màn The End)
```
Tọa độ điểm click nằm trong `VIEWS` ở `game.js`, tính theo hệ tọa độ 1920x1080 của ảnh.

## Anh Đại đi tuần
Lộ trình: phòng ông trùm, hành lang, phòng làm việc, hành lang, lặp lại. Trước khi ổng tới khu vực bạn đang đứng khoảng 4 giây sẽ có cảnh báo tiếng bước chân. Đứng ở góc nhìn `desk` hoặc `pc` (bàn máy số 4) thì an toàn. Ở các góc khác, thanh nghi ngờ sẽ tăng. Đầy thanh thì chiếu cut2 và mất 1 mạng. Mất đủ 3 mạng là thua. Lấy được chìa khóa thì có 60 giây.

## Còn chờ
- Link UX/UI của nhóm, để chỉnh layout HUD và các nút cho khớp.
- Map 2 (căn tin): chưa có quy tắc ghép mật khẩu.
