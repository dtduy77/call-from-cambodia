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
- `assets/v2/voice/`: 32 câu thoại có giọng, tạo bằng giọng Linh của macOS rồi đổi cao độ. Muốn thay bằng giọng thu âm thật thì giữ nguyên tên file.

## Bản đồ góc nhìn
```
gate (cổng, Tí độc thoại) → bấm cổng → cut2 (bị chích điện) → hall (Anh Đại: "Tỉnh rồi hả?...")
Trước khi mở được HO_SO_MAT, bấm máy lọc nước / CELL / KPI ở hành lang sẽ bị chặn ("Anh Đại đang để mắt tới mình").
office ─┬─ desk (sổ St5K) ── pc (KICH_BAN, DANH_SACH, HO_SO_MAT khóa St5K, THUNG_RAC)
        ├─ desk2 (máy người khác)
        ├─ corner (đồng hồ số 4, thùng rác số 20)
        └─↓ hallOffice ─← hall ─┬─ hallWater (ly số 2)
                                ├─ hallKPI (chữ K) ── cửa gỗ ── boss ─┬─ bossLeft
                                │                                      └─ bossRight (đầu hươu, chùm chìa khóa giấu trong miệng)
                                └─ cellDoor (keypad 2042K = giấy 20 + đồng hồ 4 + ly 2 + chữ K) ── cells (cửa 603 ở cuối hành lang, chiếu cut3, rồi Mission Complete, rồi The End)
```
Tọa độ điểm click nằm trong `VIEWS` ở `game.js`, tính theo hệ tọa độ 1920x1080 của ảnh.

## Anh Đại đi tuần
Lộ trình: phòng ông trùm, hành lang, phòng làm việc, hành lang, lặp lại. Trước khi ổng tới khu vực bạn đang đứng khoảng 4 giây sẽ có cảnh báo tiếng bước chân. Đứng ở góc nhìn `desk` hoặc `pc` (bàn máy số 4) thì an toàn. Ở các góc khác, thanh nghi ngờ sẽ tăng. Đầy thanh thì chiếu cut2 và mất 1 mạng. Mất đủ 3 mạng là thua. Lấy được chìa khóa thì có 60 giây.

## Nguồn nội dung
Lời thoại, nội dung các thư mục máy 04, mã 2042K và luồng mở đầu lấy theo video demo của nhóm (`source/d510666f-...mp4`). Câu thứ hai khi mở hồ sơ ("Còn đây là ghi chú...") bị cắt trong video nên mình tự viết tiếp. Cơ chế Anh Đại đi tuần và giao diện giữ như bản trước.

## Đối chiếu với prototype Figma
Luồng đã khớp theo prototype (56 frame): menu → cutscene 1 → cổng → hành lang (Anh Đại giao việc) → phòng làm việc → các góc nhìn → phòng ông trùm → cửa CELL → phòng giam 603 → Mission Complete. Có khoảng 18 frame trong Figma chỉ hiện nền trắng kèm mũi tên (có thể là frame thoại hoặc video chưa tải được), cần nhóm xác nhận nội dung.

## Còn chờ
- Link UX/UI của nhóm, để chỉnh layout HUD và các nút cho khớp.
- Map 2 (căn tin): chưa có quy tắc ghép mật khẩu.
