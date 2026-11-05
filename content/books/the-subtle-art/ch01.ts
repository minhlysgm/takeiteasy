import type { Passage } from "@/content/types";
import { ch01Sketches } from "./ch01-sketches";

export const ch01Passages: Passage[] = [
  {
    id: "ch01-p01",
    original:
      "Charles Bukowski was an alcoholic, a womanizer, a chronic gambler, a lout, a cheapskate, a deadbeat, and on his worst days, a poet. He's probably the last person on earth you would ever look to for life advice or expect to see in any sort of self-help book.\n\nWhich is why he's the perfect place to start.",
    translation:
      "Charles Bukowski là một gã nghiện rượu, một tay sát gái, một con bạc kinh niên, một kẻ thô lỗ, một đứa keo kiệt, một tên chây lười, và vào những ngày tồi tệ nhất của mình — một nhà thơ. Ông có lẽ là người cuối cùng trên đời mà bạn tìm đến để xin lời khuyên về cuộc sống, hay ngờ rằng sẽ xuất hiện trong bất kỳ cuốn sách self-help nào.\n\nVà chính vì thế, ông là điểm khởi đầu hoàn hảo.",
    mainIdea:
      "Manson mở chương bằng một chân dung tệ hại đúng nghĩa: Bukowski có đủ mọi thói xấu, là người cuối cùng ai đó tìm đến xin lời khuyên. Rồi ông lật ngược trong đúng một câu đứng riêng: chính vì thế Bukowski là điểm khởi đầu hoàn hảo — kiểu mở bài twist đặc trưng của cả cuốn sách.",
    chunks: [
      {
        id: "chronic",
        match: "chronic",
        label: "chronic = kinh niên\n(chronic gambler / pain)",
        headword: "chronic + noun",
        meaning: "= kinh niên, mạn tính — thói xấu hoặc vấn đề kéo dài dai dẳng",
        examples: [
          { en: "He's a chronic procrastinator — every task slips to the last day.", vi: "Anh ấy là chúa trì hoãn kinh niên — việc gì cũng dồn tới ngày cuối." },
          { en: "She suffers from chronic back pain.", vi: "Cô ấy bị đau lưng kinh niên." },
        ],
      },
      {
        id: "on-his-worst-days",
        match: "on his worst days",
        label: "on one's worst days\n= vào những ngày tệ nhất",
        headword: "on one's best / worst days",
        meaning: "= vào những ngày sung nhất / tệ nhất của ai đó",
        examples: [
          { en: "Even on my worst days, I still make time for breakfast with my family.", vi: "Kể cả những ngày tệ nhất, tôi vẫn dành thời gian ăn sáng cùng gia đình." },
          { en: "On her best days, she can run ten kilometers without stopping.", vi: "Vào những ngày sung nhất, cô ấy chạy mười cây số không nghỉ." },
        ],
      },
      {
        id: "last-person-on-earth",
        match: "the last person on earth",
        label: "the last person on earth\n(you would ever...)",
        headword: "the last person (on earth) + mệnh đề quan hệ",
        meaning: "= người cuối cùng mà... — cách nhấn mạnh \"không đời nào là người này\"",
        examples: [
          { en: "He's the last person I'd trust with a secret.", vi: "Anh ta là người cuối cùng tôi dám tin để kể bí mật." },
          { en: "She's the last person on earth who would forget your birthday.", vi: "Cô ấy là người cuối cùng trên đời có thể quên sinh nhật bạn." },
        ],
      },
      {
        id: "look-to-for",
        match: "look to for life advice",
        label: "look to sb for sth\n= tìm đến ai để xin gì",
        headword: "look to somebody for something",
        meaning: "= tìm đến ai, trông cậy vào ai để xin lời khuyên / sự giúp đỡ",
        examples: [
          { en: "Children often look to their parents for guidance.", vi: "Con cái thường tìm đến cha mẹ để được định hướng." },
          { en: "Don't look to me for sympathy — I warned you.", vi: "Đừng tìm đến tôi mong được thông cảm — tôi cảnh báo rồi mà." },
        ],
        note: "Trong câu này giới từ đứng cuối mệnh đề quan hệ: the last person you would ever look to (= mà bạn tìm đến).",
      },
      {
        id: "which-is-why",
        match: "Which is why",
        label: "..., which is why...\n= chính vì vậy mà",
        headword: "..., which is why ...",
        meaning: "= chính vì vậy mà... — nối thẳng vào cả ý của câu trước",
        pattern: { formula: "[sự việc], which is why [hệ quả]", note: "Manson còn tách hẳn thành câu riêng để nhấn mạnh — văn nói làm được y hệt." },
        examples: [
          { en: "The bus kept coming late, which is why I finally bought a motorbike.", vi: "Xe buýt cứ trễ suốt, chính vì vậy mà cuối cùng tôi mua hẳn xe máy." },
          { en: "She always keeps her word, which is why everyone trusts her.", vi: "Cô ấy luôn giữ lời, chính vì thế mà ai cũng tin cô ấy." },
        ],
      },
    ],
    sketch: ch01Sketches.p01,
  },
  {
    id: "ch01-p02",
    original:
      "Bukowski wanted to be a writer. But for decades his work was rejected by almost every magazine, newspaper, journal, agent, and publisher he submitted to. His work was horrible, they said. Crude. Disgusting. Depraved. And as the stacks of rejection slips piled up, the weight of his failures pushed him deep into an alcohol-fueled depression that would follow him for most of his life.",
    translation:
      "Bukowski muốn trở thành nhà văn. Nhưng suốt hàng chục năm, tác phẩm của ông bị từ chối bởi gần như mọi tạp chí, tờ báo, tập san, người đại diện và nhà xuất bản mà ông gửi bản thảo tới. Tác phẩm của ông thật kinh khủng, họ bảo vậy. Thô thiển. Kinh tởm. Đồi trụy. Và khi chồng giấy báo từ chối ngày một dày lên, sức nặng của những thất bại đẩy ông chìm sâu vào một cơn trầm cảm ngập trong men rượu — thứ sẽ đeo bám ông gần trọn phần đời còn lại.",
    mainIdea:
      "Nền của câu chuyện: trước khi nổi tiếng, Bukowski là hàng chục năm thất bại — bị từ chối ở mọi cửa, chìm trong rượu và trầm cảm. Manson dựng chân dung \"kẻ thua cuộc\" này để cú lật ở các đoạn sau (thành công không đến từ việc cố làm người thắng) có sức nặng.",
    chunks: [
      {
        id: "submit-to",
        match: "submitted to",
        label: "submit sth to sb\n= gửi (bản thảo) tới",
        headword: "submit (work) to somebody",
        meaning: "= nộp, gửi (bản thảo, hồ sơ, báo cáo) cho ai để xét duyệt",
        examples: [
          { en: "I submitted the proposal to three different publishers.", vi: "Tôi đã gửi bản đề xuất tới ba nhà xuất bản khác nhau." },
          { en: "Submit your visa application to the embassy before it closes.", vi: "Nộp hồ sơ visa cho đại sứ quán trước khi họ đóng cửa." },
        ],
        note: "Để ý cấu trúc: every publisher he submitted to — giới từ đứng cuối mệnh đề quan hệ.",
      },
      {
        id: "pile-up",
        match: "piled up",
        label: "pile up = chất đống,\ndồn ứ ngày càng nhiều",
        headword: "pile up",
        meaning: "= chất đống, dồn ứ lại ngày càng nhiều (việc, nợ, email, bug...)",
        examples: [
          { en: "My unread emails piled up while I was on leave.", vi: "Email chưa đọc dồn ứ lại trong lúc tôi nghỉ phép." },
          { en: "The dirty dishes piled up after the party.", vi: "Chén đĩa bẩn chất đống sau bữa tiệc." },
        ],
      },
      {
        id: "weight-of",
        match: "the weight of his failures",
        label: "the weight of sth\n= sức nặng của...",
        headword: "the weight of something",
        meaning: "= sức nặng (nghĩa bóng) của kỳ vọng, thất bại, trách nhiệm...",
        examples: [
          { en: "He carried the weight of the whole family after his father passed away.", vi: "Anh ấy gánh cả sức nặng của gia đình sau khi cha qua đời." },
          { en: "The weight of expectations can crush young players.", vi: "Sức nặng của kỳ vọng có thể đè bẹp những cầu thủ trẻ." },
        ],
      },
      {
        id: "push-into",
        match: "pushed him deep into",
        label: "push sb into sth\n= đẩy ai vào (trạng thái)",
        headword: "push somebody (deep) into something",
        meaning: "= đẩy ai vào một trạng thái / hoàn cảnh (thường là xấu)",
        examples: [
          { en: "Months of pressure pushed her into a deep depression.", vi: "Nhiều tháng áp lực đẩy cô ấy vào một cơn trầm cảm nặng." },
          { en: "Don't let anyone push you into a decision you're not ready for.", vi: "Đừng để ai đẩy bạn vào một quyết định mà bạn chưa sẵn sàng." },
        ],
      },
      {
        id: "x-fueled",
        match: "alcohol-fueled",
        label: "X-fueled = ngập trong X\n(caffeine-fueled...)",
        headword: "X-fueled (tính từ ghép)",
        meaning: "= được \"đốt\" bằng X, ngập trong X — ghép danh từ + fueled thành tính từ",
        examples: [
          { en: "It was a caffeine-fueled all-nighter before the final exam.", vi: "Đó là một đêm trắng chạy bằng caffeine trước kỳ thi cuối." },
          { en: "The debate turned into an ego-fueled shouting match.", vi: "Cuộc tranh luận biến thành màn đấu khẩu bơm đầy cái tôi." },
        ],
      },
    ],
    sketch: ch01Sketches.p02,
  },
  {
    id: "ch01-p03",
    original:
      "See, despite the book sales and the fame, Bukowski was a loser. He knew it, and his success stemmed not from some determination to be a winner, but from the fact that he knew he was a loser, accepted it, and then wrote honestly about it. He never tried to be anything other than what he was. The genius in Bukowski's work was not in overcoming unbelievable odds or developing himself into a shining literary light. It was the opposite. It was his simple ability to be completely unflinchingly honest with himself, especially about the worst parts of himself, and to share his failings without hesitation or doubt.",
    translation:
      "Thấy chưa, bất chấp doanh số sách và sự nổi tiếng, Bukowski vẫn là một kẻ thất bại. Ông biết điều đó, và thành công của ông không bắt nguồn từ một quyết tâm nào đó để trở thành người chiến thắng, mà từ chính việc ông biết mình là một kẻ thất bại, chấp nhận điều đó, rồi viết về nó một cách chân thật. Ông chưa bao giờ cố trở thành bất cứ ai khác ngoài chính con người vốn có của mình. Thiên tài trong các tác phẩm của Bukowski không nằm ở việc vượt qua những nghịch cảnh không tưởng hay biến bản thân thành một ngôi sao sáng của văn chương. Hoàn toàn ngược lại. Nó nằm ở khả năng đơn giản của ông: hoàn toàn, không chút nao núng, thành thật với chính mình — đặc biệt là về những phần tồi tệ nhất trong con người mình — và chia sẻ những thất bại, khuyết điểm của bản thân mà không hề do dự hay nghi ngờ.",
    mainIdea:
      "Đoạn mở đầu cho nghịch lý \"Don't try\": Bukowski thành công không phải vì cố trở thành winner, mà vì biết mình là loser, chấp nhận điều đó, và viết về nó một cách chân thật — không che giấu, không tô vẽ.",
    chunks: [
      {
        id: "despite",
        match: "despite",
        label: "despite + noun / V-ing = bất chấp, mặc dù",
        headword: "despite + noun / V-ing",
        meaning: "= mặc dù / bất chấp",
        examples: [
          { en: "Despite the rain, we went out.", vi: "Mặc dù trời mưa, chúng tôi vẫn ra ngoài." },
          { en: "Despite working hard, he didn't get the result he wanted.", vi: "Mặc dù làm việc chăm chỉ, anh ấy không đạt được kết quả mình mong muốn." },
        ],
        mistake: { wrong: "Despite of the rain", right: "Despite the rain" },
        note: "despite và in spite of nghĩa gần như nhau.",
      },
      {
        id: "stem-from",
        match: "stemmed not from",
        label: "stem from = bắt nguồn từ\nnot from A, but from B",
        headword: "stem from something",
        meaning: "= bắt nguồn từ / xuất phát từ",
        pattern: { formula: "stems not from A, but from B", note: "không bắt nguồn từ A, mà từ B" },
        examples: [
          { en: "The problem stems not from a lack of money, but from a lack of trust.", vi: "Vấn đề không bắt nguồn từ chuyện thiếu tiền, mà từ chuyện thiếu niềm tin." },
          { en: "His confidence stems from years of experience.", vi: "Sự tự tin của anh ấy đến từ nhiều năm kinh nghiệm." },
        ],
      },
      {
        id: "anything-other-than",
        match: "anything other than what he was",
        label: "anything other than...\n= bất cứ gì khác ngoài...",
        headword: "be anything other than + noun",
        meaning: "= bất cứ thứ gì khác ngoài...",
        examples: [
          { en: "I don't want to be anything other than myself.", vi: "Tôi không muốn trở thành bất kỳ ai khác ngoài chính mình." },
          { en: "He never pretended to be anything other than a normal guy.", vi: "Anh ấy chưa bao giờ giả vờ mình là gì khác ngoài một người bình thường." },
        ],
      },
      {
        id: "unflinchingly",
        match: "unflinchingly honest",
        label: "unflinchingly\n= không hề nao núng",
        headword: "unflinchingly honest",
        meaning: "= thành thật tuyệt đối, không né tránh — mạnh hơn nhiều so với very honest",
        examples: [
          { en: "She was unflinchingly honest about her mistakes.", vi: "Cô ấy thành thật một cách không hề né tránh về những sai lầm của mình." },
        ],
      },
      {
        id: "without-hesitation",
        match: "without hesitation or doubt",
        label: "without hesitation\n= không chút do dự",
        headword: "without hesitation or doubt",
        meaning: "= không do dự, không chút nghi ngại",
        examples: [
          { en: "She agreed without hesitation.", vi: "Cô ấy đồng ý ngay, không hề do dự." },
          { en: "He answered without hesitation.", vi: "Anh ấy trả lời ngay lập tức, không chút do dự." },
        ],
      },
    ],
    sketch: ch01Sketches.p03,
  },
];
