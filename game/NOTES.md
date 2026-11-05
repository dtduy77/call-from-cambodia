# Cuộc Gọi Từ Campuchia: ghi chú làm game

Trạng thái: **Map 1 đã chơi được** (mở `index.html`). Code nằm ở `index.html`, `style.css`, `game.js`. Map 2 chưa làm.

## Asset (game/assets/)

Mọi ảnh đều tách từ file PDF "WORK EXPERIENCE" (art của nhóm). Ảnh trong pptx phần lớn là ảnh tham khảo nên không dùng.

| File | Nội dung | Nguồn |
|---|---|---|
| bg_office.jpg | Phòng làm việc, có màu, máy PC 02/03/04 (1280x720) | p107 |
| bg_hall.jpg | Hành lang A: máy lọc nước, cửa CELL + keypad, bảng KPI, cửa OFFICE bên phải | p121 |
| bg_hallB.jpg | Hành lang B: thang máy, tranh "Mono Visa", cửa xanh (dẫn vào phòng Anh Đại) | p106 |
| bg_boss.jpg | Phòng Anh Đại (line art), có đầu hươu treo tường | p143 |
| bg_menu.jpg | Main menu (line art); các nút vẽ sẵn: Play Game ~(75-325, 288-345), Options ~(75-300, 362-420), More games ~(70-300, 438-500) | p124 |
| ti_front / anyen / anhdai.png | 3 nhân vật có màu, đã tách nền, cao 520px | p112 |
| ti_turn0..4.png | Turnaround của Tí: trước, 3/4, **nghiêng (turn2, quay mặt sang phải)**, sau 3/4, sau | p111 |
| ti_pose0..2.png | Pose của Tí (pose0 đang nghe điện thoại, dùng cho cutscene 1) | p139 |
| face_angry / happy / shock.png | Biểu cảm mặt Tí | p114/116/118 |
| face_dai / face_yen.png | Chân dung Anh Đại và An Yên cho hộp thoại | cắt từ p112 |
| props/*.png | monitor, pc_case, keyboard, mouse, cup_2, keys, clock, trash (line art) | p109 |
| storyboard/ | 29 khung storyboard Map 1, đánh số theo thứ tự | |
| sketches/ | Sketch nhân vật, sheet gốc, bản phòng Anh Đại cũ | |
| raw_pdf/ | Toàn bộ ảnh gốc trong PDF, chưa chỉnh sửa | |

## Luồng Map 1 (theo storyboard)

1. Anh Đại: "Mày ngồi ở máy 4, lo mà làm đi. Còn không đừng có mơ mà thoát khỏi đây."
2. Đọc "Giấy bàn giao máy": PC01 7n2P, PC02 4C9a, PC03 J97t, **PC04 St5K**.
3. Nhập St5K vào folder trên PC04. Ra hồ sơ: Nguyễn An Yên, 01-04-2007, Việt Nam, **Prison cell PK5**.
4. Tìm 4 ký tự màu xanh lá:
   - **2** trên cốc ở máy lọc nước
   - **4** trên đồng hồ ("kim giây chỉ chạy qua số 4")
   - **K** trên bảng KPI
   - **20** trên giấy SBD PC09 trong thùng rác
5. Nhập **24K20** vào keypad cửa khu giam.
6. Lấy chìa khóa treo ở đầu hươu trong phòng Anh Đại, rồi mở buồng PK5 để giải cứu An Yên.

## Thiết kế đã code

- Game web HTML5 Canvas, nằm trong `game/` (index.html + game.js), màn chơi 1280x720.
- Điều khiển: ←/→ (hoặc A/D) để đi, E hoặc Space để tương tác, có hỗ trợ click chuột.
- Các phòng:
  - Phòng làm việc → (mép trái) → Hành lang A (vào ở phía cửa OFFICE bên phải)
  - Hành lang A → (mép trái) → Hành lang B → (cửa xanh) → Phòng Anh Đại
  - Hành lang A → (cửa CELL) → Khu giam (vẽ bằng code, có các buồng PK1-PK6)
- Anh Đại tuần tra qua các phòng. Thanh Detection tăng khi bị nhìn thấy lúc đang làm việc khả nghi; ngồi ở PC04 thì an toàn. Đầy thanh thì bị chích điện, mất 1 mạng (có 3 mạng).
- Lấy chìa khóa xong sẽ bắt đầu đếm ngược 90 giây.
- HUD gồm Objective, Timer, Detection, Clues (theo slide 53).
- Font Be Vietnam Pro và VT323. Âm thanh tổng hợp bằng WebAudio.
- Có Ending choice (thoát ngay / đối đầu Anh Đại), kèm thông điệp nâng cao nhận thức ở cuối game.
- Map 2 (căn tin: K-04, BA9, GA11, món 7): **cần nhóm chốt quy tắc ghép mật khẩu** vì tài liệu chưa ghi rõ.
