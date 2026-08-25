import type { Passage } from "@/content/types";

export const ch01Passages: Passage[] = [
  {
    id: "ch01-p01",
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
          { en: "The issue stems not from the frontend, but from the backend.", vi: "Vấn đề không nằm ở frontend, mà ở backend." },
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
  },
];
