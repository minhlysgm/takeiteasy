import type { Passage } from "@/content/types";
import { ch01Sketches } from "./ch01-sketches";

export const ch01Passages: Passage[] = [
  {
    id: "ch01-p01",
    caption:
      "This is Charles Bukowski, and his life is a mess. He drinks too much, bets his rent money on horse races, and the letters piling up on his desk all say the same thing: no thanks. Most people would give up. He just keeps writing, one bad poem after another, and never pretends to be anyone else.",
    translation:
      "Đây là Charles Bukowski, và cuộc đời ông là một mớ hỗn độn. Ông uống quá nhiều, đem cả tiền nhà đi cá ngựa, và chồng thư chất đống trên bàn đều nói cùng một câu: cảm ơn, không cần. Ở vào hoàn cảnh đó, hầu hết mọi người sẽ bỏ cuộc. Còn ông cứ viết tiếp, hết bài thơ dở này tới bài thơ dở khác, và chưa bao giờ giả vờ làm một người khác.",
    mainIdea:
      "Bukowski thất bại triền miên nhưng không bỏ viết, và cũng không cố tỏ ra tốt đẹp hơn con người thật của mình. Cuốn sách mở đầu bằng ông để nói một điều ngược đời: thành thật với cái dở của mình có khi lại là lối ra.",
    chunks: [
      {
        id: "is-a-mess",
        match: "is a mess",
        label: "bừa bộn / rối tung",
        headword: "be a mess",
        meaning: "Bừa bộn, rối tung — dùng cho đồ đạc, cuộc sống hay tâm trạng.",
        examples: [
          { en: "My room is a mess after the party.", vi: "Phòng tui bừa tung sau bữa tiệc." },
          { en: "I was a mess before my exam.", vi: "Trước kỳ thi tui rối hết cả lên." },
        ],
      },
      {
        id: "bet-on",
        match: "bets his rent money on",
        label: "cược tiền vào",
        headword: "bet (money) on something",
        meaning: "Đặt cược (tiền) vào cái gì đó. Nói \"I wouldn't bet on…\" còn có nghĩa là \"không dám chắc…\".",
        pattern: { formula: "bet + tiền + on + thứ gì" },
        examples: [
          { en: "He bet fifty dollars on the football match and lost.", vi: "Anh ấy cược 50 đô vào trận bóng và thua." },
          { en: "I wouldn't bet on the bus being on time.", vi: "Tui không dám chắc xe buýt tới đúng giờ đâu." },
        ],
      },
      {
        id: "pile-up",
        match: "piling up",
        label: "chất đống",
        headword: "pile up",
        meaning: "Chất đống, dồn lại ngày càng nhiều.",
        examples: [
          { en: "The dishes keep piling up when I'm busy.", vi: "Lúc bận là chén bát cứ dồn lại." },
          { en: "Emails piled up while I was on holiday.", vi: "Email dồn đống trong lúc tui đi nghỉ." },
        ],
      },
      {
        id: "give-up",
        match: "give up",
        label: "bỏ cuộc",
        headword: "give up",
        meaning: "Bỏ cuộc, thôi không cố nữa.",
        examples: [
          { en: "Don't give up on your diet after one bad day.", vi: "Đừng bỏ chế độ ăn chỉ vì một hôm lỡ ăn nhiều." },
          { en: "She gave up trying to fix the old bike.", vi: "Cô ấy thôi không cố sửa chiếc xe đạp cũ nữa." },
        ],
        mistake: { wrong: "give up to try", right: "give up trying" },
      },
    ],
    sketch: ch01Sketches.p01,
  },
  {
    id: "ch01-p02",
    caption:
      "It’s three in the morning and she still can’t fall asleep. First she worries about tomorrow’s meeting. Then she worries because she can’t stop worrying, and her thoughts go round in circles. The harder she fights them, the louder they get. Sometimes the way out is simply to say, “Okay, I’m worried,” and let it be.",
    translation:
      "Đã ba giờ sáng mà cô vẫn không ngủ được. Lúc đầu cô lo về cuộc họp ngày mai. Rồi cô lại lo vì mình không ngừng lo được, và suy nghĩ cứ quẩn quanh mãi một chỗ. Cô càng cố gạt đi, chúng càng ồn ào hơn. Đôi khi lối ra chỉ đơn giản là tự nhủ: “Ừ, mình đang lo,” rồi để mặc nó.",
    mainIdea:
      "Lo lắng là chuyện bình thường; điều làm mình kiệt sức là lo vì mình đang lo. Chấp nhận cảm xúc xấu thay vì chống lại nó thì vòng lặp tự dịu xuống.",
    chunks: [
      {
        id: "fall-asleep",
        match: "fall asleep",
        label: "ngủ thiếp đi",
        headword: "fall asleep",
        meaning: "Chìm vào giấc ngủ. Khác \"go to sleep\" là hành động đi ngủ.",
        examples: [
          { en: "I fell asleep on the sofa watching TV.", vi: "Tui ngủ quên trên sofa lúc đang xem TV." },
          { en: "The baby finally fell asleep at ten.", vi: "Mãi 10 giờ em bé mới chịu ngủ." },
        ],
        mistake: { wrong: "I fell sleep", right: "I fell asleep" },
      },
      {
        id: "go-round-in-circles",
        match: "go round in circles",
        label: "quẩn quanh",
        headword: "go round in circles",
        meaning: "Cứ lặp lại một chỗ, không đi tới đâu.",
        examples: [
          { en: "We argued for an hour and just went round in circles.", vi: "Tụi tui cãi nhau cả tiếng mà cứ luẩn quẩn một chỗ." },
          { en: "My mind goes round in circles before a big trip.", vi: "Trước chuyến đi xa đầu tui cứ quay mòng mòng." },
        ],
      },
      {
        id: "the-harder-the-louder",
        match: "The harder she fights them, the louder they get",
        label: "càng… càng…",
        headword: "the harder…, the louder…",
        meaning: "Mẫu \"càng… càng…\": hai vế đều mở đầu bằng \"the\" + so sánh hơn.",
        pattern: { formula: "The + so sánh hơn + S + V, the + so sánh hơn + S + V" },
        examples: [
          { en: "The more you practice, the easier it gets.", vi: "Càng tập nhiều, càng thấy dễ." },
          { en: "The earlier we leave, the better.", vi: "Đi càng sớm càng tốt." },
        ],
        mistake: { wrong: "More you practice, more easier it gets.", right: "The more you practice, the easier it gets." },
      },
      {
        id: "let-it-be",
        match: "let it be",
        label: "để mặc nó",
        headword: "let it be",
        meaning: "Để yên, không cố thay đổi hay can thiệp.",
        examples: [
          { en: "The cake isn't perfect, but let it be — it still tastes good.", vi: "Bánh chưa đẹp, nhưng kệ nó đi — vẫn ngon mà." },
          { en: "If he's upset, just let it be for a while.", vi: "Nếu anh ấy đang bực thì cứ để yên một lúc." },
        ],
      },
    ],
    sketch: ch01Sketches.p02,
  },
  {
    id: "ch01-p03",
    caption:
      "He chases happiness the way a kid chases a balloon. Every time he reaches for it, it floats a little further away. Meanwhile, the man on the bench isn’t chasing anything. He’s had a rough week, and he’s okay with that. Funny enough, he’s the one who looks happy, sipping his tea in the sun.",
    translation:
      "Anh ấy đuổi theo hạnh phúc như đứa trẻ đuổi theo quả bóng bay. Mỗi lần với tới, nó lại bay xa thêm một chút. Trong khi đó, người đàn ông trên ghế đá chẳng đuổi theo thứ gì. Ông vừa trải qua một tuần vất vả, và ông thấy vậy cũng được. Buồn cười thay, chính ông mới là người trông hạnh phúc, nhâm nhi tách trà dưới nắng.",
    mainIdea:
      "Càng ráo riết đuổi theo cảm giác vui, mình càng thấy mình thiếu. Chấp nhận cả những ngày không vui lại làm lòng nhẹ hơn.",
    chunks: [
      {
        id: "chase",
        match: "chases",
        label: "đuổi theo",
        headword: "chase (something)",
        meaning: "Đuổi theo; nghĩa bóng là ráo riết theo đuổi (ước mơ, tiền, cảm giác…).",
        examples: [
          { en: "The dog chased the cat around the yard.", vi: "Con chó rượt con mèo quanh sân." },
          { en: "She's chasing her dream of opening a bakery.", vi: "Cô ấy đang theo đuổi giấc mơ mở tiệm bánh." },
        ],
      },
      {
        id: "every-time",
        match: "Every time",
        label: "mỗi lần",
        headword: "every time + mệnh đề",
        meaning: "\"Mỗi lần… thì…\". Không cần thêm \"when\" sau \"every time\".",
        pattern: { formula: "Every time + S + V, S + V" },
        examples: [
          { en: "Every time I wash my car, it rains.", vi: "Lần nào tui rửa xe là trời mưa." },
          { en: "She smiles every time she sees her dog.", vi: "Lần nào thấy con chó, cô ấy cũng cười." },
        ],
        mistake: { wrong: "Every time when I wash my car…", right: "Every time I wash my car…" },
      },
      {
        id: "rough-week",
        match: "a rough week",
        label: "tuần vất vả",
        headword: "a rough week",
        meaning: "Một tuần khó khăn, mệt mỏi. \"Rough\" ở đây là gian nan, không suôn sẻ.",
        examples: [
          { en: "I've had a rough day at work.", vi: "Hôm nay đi làm mệt muốn xỉu." },
          { en: "You look tired — rough night?", vi: "Trông bạn mệt quá — tối qua ngủ không ngon à?" },
        ],
      },
      {
        id: "okay-with",
        match: "okay with that",
        label: "thấy ổn với",
        headword: "be okay with something",
        meaning: "Chấp nhận được, không thấy phiền về chuyện gì.",
        examples: [
          { en: "Are you okay with pizza for dinner?", vi: "Tối ăn pizza bạn thấy được không?" },
          { en: "I'm okay with waiting a bit longer.", vi: "Tui đợi thêm chút cũng được." },
        ],
      },
    ],
    sketch: ch01Sketches.p03,
  },
];
