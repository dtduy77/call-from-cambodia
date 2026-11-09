# Cuộc Gọi Từ Campuchia: ghi chú game (bản point-and-click)

Bản chơi thử: https://call-from-cambodia.vercel.app/ (Vercel tự deploy mỗi khi push lên `main`, phục vụ thư mục `game/`).

Game là escape room góc nhìn thứ nhất. Người chơi bấm mũi tên đỏ để đi (vị trí và hướng giống prototype Figma: ngang, thẳng lên, xéo ↗ ↖), tam giác ▼ ở giữa đáy để quay lại, và bấm vào đồ vật để xem. Rê chuột lên mũi tên hoặc đồ vật sẽ hiện tên.

## Cấu trúc
- `index.html`, `style.css`, `game.js`: toàn bộ code, không cần build.
- `assets/v2/rooms/`: 14 góc nhìn, ảnh 1920x1080.
- `assets/v2/props/`: đồ vật đã tách nền, dùng khi phóng to đồ vật và trong ô đồ.
- `assets/v2/ui/`: menu, options, sound, tutorial, quit, pause, the end, khung thoại; 2 tấm bảng gỗ HUD (`hud_obj/inv.png`; `hud_det.png` mức nghi ngờ nhóm có vẽ nhưng không dùng nữa vì đã bỏ Anh Đại đi tuần), hộp mật khẩu `pw_win.jpg` và hồ sơ An Yên `profile_win.jpg` lấy từ `source/icon` (hồ sơ gốc ghi P.605, đã sửa thành P.603 cho khớp cảnh phòng giam).
- `assets/v2/chars/`: Anh Đại, An Yên (chỉ hiện trong khung thoại khi họ nói), Tí (chưa dùng vì góc nhìn thứ nhất).
- `assets/v2/video/`: cut1 (nhận nhiệm vụ), cut2 (bị chích điện, chỉ chiếu 1 lần ngay khi mở được HO_SO_MAT), cut3 (giải cứu). Đã chuyển sang H.264 720p.
- `assets/v2/voice/`: giọng đã chốt với nhóm. An Yên: yen1, yen2 là file thu thật (`source/voice yen`), nokey, yen3 clone từ giọng đó bằng G-OmniVoice (chạy trên máy). Anh Đại và Tí: clone bằng G-OmniVoice từ file mẫu nhóm gửi (`source/voice dai/Đường Cầu Vồng 3 12.m4a`, `source/voice ti/Đường Cầu Vồng 3 8.m4a`); riêng gate1_ti là chính file thu của Tí. Các câu không còn dùng (wake/good/caught/gameover của Đại, alo của Tí) vẫn là giọng VieNeu cũ.

## Bản đồ góc nhìn
Luồng theo prototype Figma (frame f04 → f56) và deck `source/cuoc goi tu campuchia` (slide 24–40).
```
cut1 → 2 câu thoại của Tí ở cổng → ↑ vào thẳng hall (Anh Đại giao việc qua khung thoại)
hall ─┬─ → hallOffice (cửa OFFICE, slide 33) ─↗─ pc (ngồi máy 04 của Tí, slide 34: KICH_BAN, DANH_SACH, HO_SO_MAT khóa St5K, THUNG_RAC; nhập đúng St5K → cut2 chích điện → thoại → hồ sơ An Yên)
      │                                           ├─ → desk (bàn dán giấy note, slide 35) ─ → desk2 (bàn có cuốn sổ St5K)
      │                                           └─ ← office (toàn cảnh, slide 36) ─┬─↗ corner (đồng hồ số 4, thùng rác số 20, slide 37)
      │                                                                              ├─ 3 máy còn lại → other1 → other2 → other3 (cùng 1 ảnh bàn dán note, ▼ về office)
      │                                                                              └─↑ ra hall
      ├─ ← hallWater (ly số 2)
      ├─ ↑ hallKPI (chữ K) ─↑─ boss ─┬─ bossLeft
      │                              └─ bossRight (đầu hươu, chùm chìa khóa giấu trong miệng)
      └─ ↑ cellDoor (keypad 24K20 = ly 2 + đồng hồ 4 + chữ K + giấy 20) ── cells (buồng 603 cuối dãy) → cut3 → Mission Complete → The End
```
Game tuyến tính, chơi một mạch tới cuối, không có mạng/thua/đếm giờ. Trước khi mở được HO_SO_MAT, bấm máy lọc nước / CELL / KPI ở hành lang sẽ bị chặn bằng câu thoại của Tí.
Mật khẩu phân biệt hoa/thường: thư mục `St5K`, cửa phòng giam `24K20`.
Tọa độ điểm click (`spots`) và mũi tên (`nav`) nằm trong `VIEWS` ở `game.js`, tính theo hệ tọa độ 1920x1080 của ảnh.
Khi thay ảnh/âm thanh mà giữ nguyên tên file, đổi `ASSET_V` ở đầu `game.js` (và `?v=` trong `index.html` nếu sửa code/CSS) để trình duyệt không dùng bản cũ trong cache.

## Anh Đại
Theo góp ý của cô: Anh Đại không xuất hiện trong cảnh, chỉ nói qua khung thoại (giao việc ở hành lang, và sau đoạn bị chích điện). Đã bỏ cơ chế đi tuần, thanh nghi ngờ, 3 mạng và 60 giây sau khi lấy chìa khóa.
Không thêm hình gì ngoài phần nhóm vẽ (đã bỏ tờ note gợi ý cạnh hồ sơ và tờ "Mẹo nhỏ" ở Tutorial).

## Nguồn nội dung
Lời thoại, nội dung các thư mục máy 04, mã 2042K và luồng mở đầu lấy theo video demo của nhóm (`source/d510666f-...mp4`). Câu thứ hai khi mở hồ sơ ("Còn đây là ghi chú...") bị cắt trong video nên mình tự viết tiếp. Cơ chế Anh Đại đi tuần và giao diện giữ như bản trước.

## Đối chiếu với prototype Figma
Luồng đã khớp theo prototype (56 frame): menu → cutscene 1 → cổng → hành lang (Anh Đại giao việc) → phòng làm việc → các góc nhìn → phòng ông trùm → cửa CELL → phòng giam 603 → Mission Complete. Có khoảng 18 frame trong Figma chỉ hiện nền trắng kèm mũi tên (có thể là frame thoại hoặc video chưa tải được), cần nhóm xác nhận nội dung.

## Còn chờ
- Link UX/UI của nhóm, để chỉnh layout HUD và các nút cho khớp.
- Map 2 (căn tin): chưa có quy tắc ghép mật khẩu.
