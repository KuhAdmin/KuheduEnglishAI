import type { ListenItem, PlacementItem, SpeakItem, UnderstandItem } from '../lib/itemSchema'

/**
 * Starter question bank, written by the assistant.
 * TODO(content): have an English-teaching specialist review the questions and their levels, and
 * a native speaker the Bengali and Hindi help texts, before real learners are placed with them.
 *
 * Change this version whenever questions are added, removed or re-levelled: a test in progress
 * on an older bank is started afresh rather than continued on different questions.
 */
export const ASSESSMENT_VERSION = '2026-10-starter-1'

const listen: Omit<ListenItem, 'stage'>[] = [
  // ── Foundation ──
  {
    id: 'L-F-1',
    level: 'FOUNDATION',
    audioText: 'Hello. My name is Priya.',
    question: 'What is her name?',
    options: ['Anita', 'Priya', 'Sunita', 'Meena'],
    answer: 1,
    translations: {
      bn: 'হ্যালো। আমার নাম প্রিয়া। — তার নাম কী?',
      hi: 'नमस्ते। मेरा नाम प्रिया है। — उसका नाम क्या है?',
    },
  },
  {
    id: 'L-F-2',
    level: 'FOUNDATION',
    audioText: 'I have two cats.',
    question: 'How many cats does the speaker have?',
    options: ['One', 'Two', 'Three', 'Four'],
    answer: 1,
    translations: {
      bn: 'আমার দুটি বিড়াল আছে। — বক্তার কয়টি বিড়াল আছে?',
      hi: 'मेरे पास दो बिल्लियाँ हैं। — बोलने वाले के पास कितनी बिल्लियाँ हैं?',
    },
  },
  {
    id: 'L-F-3',
    level: 'FOUNDATION',
    audioText: 'Good morning. This is my book.',
    question: 'What does the speaker have?',
    options: ['A book', 'A pen', 'A bag', 'A phone'],
    answer: 0,
    translations: {
      bn: 'সুপ্রভাত। এটা আমার বই। — বক্তার কাছে কী আছে?',
      hi: 'सुप्रभात। यह मेरी किताब है। — बोलने वाले के पास क्या है?',
    },
  },
  {
    id: 'L-F-4',
    level: 'FOUNDATION',
    audioText: 'My bag is red.',
    question: 'What colour is the bag?',
    options: ['Blue', 'Green', 'Black', 'Red'],
    answer: 3,
    translations: {
      bn: 'আমার ব্যাগটা লাল। — ব্যাগটার রং কী?',
      hi: 'मेरा बैग लाल है। — बैग किस रंग का है?',
    },
  },

  // ── A1 ──
  {
    id: 'L-A1-1',
    level: 'A1',
    audioText: "Hi, I'm Priya. I live in Kolkata.",
    question: 'Where does Priya live?',
    options: ['Delhi', 'Mumbai', 'Kolkata', 'Chennai'],
    answer: 2,
    translations: {
      bn: 'হাই, আমি প্রিয়া। আমি কলকাতায় থাকি। — প্রিয়া কোথায় থাকে?',
      hi: 'हाय, मैं प्रिया हूँ। मैं कोलकाता में रहती हूँ। — प्रिया कहाँ रहती है?',
    },
  },
  {
    id: 'L-A1-2',
    level: 'A1',
    audioText: 'My brother is a teacher. He works in a school.',
    question: 'What is his job?',
    options: ['Doctor', 'Driver', 'Farmer', 'Teacher'],
    answer: 3,
    translations: {
      bn: 'আমার ভাই একজন শিক্ষক। সে একটি স্কুলে কাজ করে। — তার পেশা কী?',
      hi: 'मेरा भाई शिक्षक है। वह एक स्कूल में काम करता है। — उसका काम क्या है?',
    },
  },
  {
    id: 'L-A1-3',
    level: 'A1',
    audioText: "I get up at six o'clock every day.",
    question: 'What time does the speaker get up?',
    options: ["At five o'clock", "At six o'clock", "At seven o'clock", "At eight o'clock"],
    answer: 1,
    translations: {
      bn: 'আমি প্রতিদিন ছয়টায় ঘুম থেকে উঠি। — বক্তা কখন ঘুম থেকে ওঠেন?',
      hi: 'मैं हर दिन छह बजे उठता हूँ। — बोलने वाला कितने बजे उठता है?',
    },
  },
  {
    id: 'L-A1-4',
    level: 'A1',
    audioText: "I like tea, but I don't like coffee.",
    question: 'What does the speaker like?',
    options: ['Tea', 'Coffee', 'Milk', 'Juice'],
    answer: 0,
    translations: {
      bn: 'আমি চা পছন্দ করি, কিন্তু কফি পছন্দ করি না। — বক্তা কী পছন্দ করেন?',
      hi: 'मुझे चाय पसंद है, लेकिन कॉफ़ी पसंद नहीं है। — बोलने वाले को क्या पसंद है?',
    },
  },

  // ── A2 ──
  {
    id: 'L-A2-1',
    level: 'A2',
    audioText:
      'Yesterday I went to the market with my mother. We bought vegetables and some fruit.',
    question: 'What did they buy?',
    options: ['Clothes', 'Books', 'Vegetables and fruit', 'Shoes'],
    answer: 2,
    translations: {
      bn: 'গতকাল আমি মায়ের সঙ্গে বাজারে গিয়েছিলাম। আমরা সবজি আর কিছু ফল কিনেছি। — তারা কী কিনেছিল?',
      hi: 'कल मैं अपनी माँ के साथ बाज़ार गया था। हमने सब्ज़ियाँ और कुछ फल ख़रीदे। — उन्होंने क्या ख़रीदा?',
    },
  },
  {
    id: 'L-A2-2',
    level: 'A2',
    audioText: 'The bus leaves at half past nine, so please be at the stop by quarter past nine.',
    question: 'When does the bus leave?',
    options: ['At 9:00', 'At 9:15', 'At 9:30', 'At 9:45'],
    answer: 2,
    translations: {
      bn: 'বাস সাড়ে নয়টায় ছাড়বে, তাই সোয়া নয়টার মধ্যে স্টপে চলে আসুন। — বাস কখন ছাড়বে?',
      hi: 'बस साढ़े नौ बजे निकलती है, इसलिए सवा नौ बजे तक स्टॉप पर आ जाइए। — बस कब निकलती है?',
    },
  },
  {
    id: 'L-A2-3',
    level: 'A2',
    audioText: "I can't come to the party tonight because I have to study for my exam tomorrow.",
    question: "Why can't the speaker come to the party?",
    options: [
      'The speaker has to study.',
      'The speaker is ill.',
      'The speaker has to work.',
      "The speaker doesn't like parties.",
    ],
    answer: 0,
    translations: {
      bn: 'আজ রাতে আমি পার্টিতে আসতে পারব না, কারণ কালকের পরীক্ষার জন্য আমাকে পড়তে হবে। — বক্তা কেন পার্টিতে আসতে পারবেন না?',
      hi: 'मैं आज रात पार्टी में नहीं आ सकता, क्योंकि मुझे कल की परीक्षा के लिए पढ़ना है। — बोलने वाला पार्टी में क्यों नहीं आ सकता?',
    },
  },
  {
    id: 'L-A2-4',
    level: 'A2',
    audioText: 'Go straight, then turn left at the bank. The post office is next to the hospital.',
    question: 'Where is the post office?',
    options: ['Next to the bank', 'Next to the hospital', 'Behind the school', 'Opposite the bank'],
    answer: 1,
    translations: {
      bn: 'সোজা যান, তারপর ব্যাংকের কাছে বাঁ দিকে ঘুরুন। পোস্ট অফিসটি হাসপাতালের পাশে। — পোস্ট অফিস কোথায়?',
      hi: 'सीधे जाइए, फिर बैंक के पास बाएँ मुड़िए। डाकघर अस्पताल के बगल में है। — डाकघर कहाँ है?',
    },
  },

  // ── B1 ──
  {
    id: 'L-B1-1',
    level: 'B1',
    audioText:
      'I was going to take the train, but it was cancelled, so I ended up sharing a taxi with a colleague.',
    question: 'How did the speaker travel?',
    options: ['By train', 'By bus', 'On foot', 'By taxi'],
    answer: 3,
  },
  {
    id: 'L-B1-2',
    level: 'B1',
    audioText:
      'If it keeps raining like this, the match will probably be postponed until next week.',
    question: 'What may happen to the match?',
    options: [
      'It will start early.',
      'It may be moved to next week.',
      'It was played yesterday.',
      'It will be shorter.',
    ],
    answer: 1,
  },
  {
    id: 'L-B1-3',
    level: 'B1',
    audioText:
      "I've been working here for three years, and I'm thinking of applying for the manager's position.",
    question: 'What is the speaker planning?',
    options: [
      'To apply for a new position',
      'To leave the company',
      'To take a holiday',
      'To work fewer hours',
    ],
    answer: 0,
  },
  {
    id: 'L-B1-4',
    level: 'B1',
    audioText: 'The doctor told him to rest for a week, but he went back to work after two days.',
    question: 'What did the man do?',
    options: [
      'He rested for a week.',
      'He changed his doctor.',
      'He returned to work early.',
      'He stayed in hospital.',
    ],
    answer: 2,
  },

  // ── B2+ ──
  {
    id: 'L-B2-1',
    level: 'B2+',
    audioText:
      'Although the new policy was meant to reduce traffic, most residents feel it has simply moved the problem to nearby streets.',
    question: 'What do most residents think?',
    options: [
      'The policy solved the problem.',
      'Traffic was never a problem.',
      'The policy should start sooner.',
      'The problem has only moved elsewhere.',
    ],
    answer: 3,
  },
  {
    id: 'L-B2-2',
    level: 'B2+',
    audioText:
      'Had I known the meeting would run so late, I would have arranged for someone else to collect the children.',
    question: 'What does the speaker mean?',
    options: [
      'The speaker arranged help in advance.',
      'The speaker did not expect the meeting to be so long.',
      'The meeting was cancelled.',
      'The children were collected early.',
    ],
    answer: 1,
  },
  {
    id: 'L-B2-3',
    level: 'B2+',
    audioText:
      "The company's profits rose slightly last year, which was surprising given how much its sales had fallen.",
    question: 'Why was the result surprising?',
    options: [
      'Sales had gone down.',
      'Profits fell sharply.',
      'The company closed.',
      'Prices were cut.',
    ],
    answer: 0,
  },
  {
    id: 'L-B2-4',
    level: 'B2+',
    audioText:
      "She's not exactly thrilled about moving, but she admits the new job is too good to turn down.",
    question: 'How does she feel?',
    options: [
      'Excited about moving',
      'Unwilling to take the job',
      'Not happy to move, but accepting the job',
      'Angry with her employer',
    ],
    answer: 2,
  },
]

const bestReply = 'What is the best reply?'
const speakerMeans = 'What does the speaker mean?'

const understand: Omit<UnderstandItem, 'stage'>[] = [
  // ── Foundation ──
  {
    id: 'U-F-1',
    level: 'FOUNDATION',
    type: 'vocabulary',
    question: 'Which word is a colour?',
    options: ['cat', 'red', 'run', 'big'],
    answer: 1,
    translations: { bn: 'কোন শব্দটি একটি রং?', hi: 'कौन सा शब्द एक रंग है?' },
  },
  {
    id: 'U-F-2',
    level: 'FOUNDATION',
    type: 'vocabulary',
    question: 'Which one can you eat?',
    options: ['chair', 'shoe', 'apple', 'door'],
    answer: 2,
    translations: { bn: 'কোনটি খাওয়া যায়?', hi: 'इनमें से क्या खाया जा सकता है?' },
  },
  {
    id: 'U-F-3',
    level: 'FOUNDATION',
    type: 'meaning',
    context: 'This is my mother.',
    question: 'Who is she?',
    options: ['My mother', 'My father', 'My friend', 'My teacher'],
    answer: 0,
    translations: { bn: 'ইনি আমার মা। — তিনি কে?', hi: 'यह मेरी माँ हैं। — वे कौन हैं?' },
  },
  {
    id: 'U-F-4',
    level: 'FOUNDATION',
    type: 'grammar',
    context: 'I ___ a student.',
    question: 'Choose the missing word.',
    options: ['is', 'are', 'am'],
    answer: 2,
  },
  {
    id: 'U-F-5',
    level: 'FOUNDATION',
    type: 'functional',
    context: 'Someone says: “Hello!”',
    question: bestReply,
    options: ['Goodbye.', 'Thank you.', 'Sorry.', 'Hello!'],
    answer: 3,
    translations: {
      bn: 'কেউ আপনাকে শুভেচ্ছা জানালেন (“Hello!”)। সবচেয়ে ভালো উত্তর কোনটি?',
      hi: 'किसी ने आपको नमस्ते कहा (“Hello!”)। सबसे अच्छा जवाब क्या है?',
    },
  },
  {
    id: 'U-F-6',
    level: 'FOUNDATION',
    type: 'functional',
    context: 'Someone says: “Thank you.”',
    question: bestReply,
    options: ['Good night.', 'You’re welcome.', 'My name is Raj.', 'Yes, please.'],
    answer: 1,
    translations: {
      bn: 'কেউ আপনাকে ধন্যবাদ দিলেন (“Thank you.”)। সবচেয়ে ভালো উত্তর কোনটি?',
      hi: 'किसी ने आपको धन्यवाद कहा (“Thank you.”)। सबसे अच्छा जवाब क्या है?',
    },
  },

  // ── A1 ──
  {
    id: 'U-A1-1',
    level: 'A1',
    type: 'vocabulary',
    question: 'What does “hungry” mean?',
    options: ['wanting sleep', 'feeling happy', 'wanting food', 'feeling cold'],
    answer: 2,
    translations: { bn: '“hungry” শব্দটির মানে কী?', hi: '“hungry” शब्द का क्या मतलब है?' },
  },
  {
    id: 'U-A1-2',
    level: 'A1',
    type: 'meaning',
    context: 'I don’t live here.',
    question: speakerMeans,
    options: [
      'My home is somewhere else.',
      'This is my home.',
      'I like this place.',
      'I am leaving now.',
    ],
    answer: 0,
    translations: {
      bn: '“আমি এখানে থাকি না।” — বক্তা কী বোঝাতে চাইছেন?',
      hi: '“मैं यहाँ नहीं रहता।” — बोलने वाले का क्या मतलब है?',
    },
  },
  {
    id: 'U-A1-3',
    level: 'A1',
    type: 'grammar',
    context: 'She ___ from India.',
    question: 'Choose the missing word.',
    options: ['am', 'is', 'are'],
    answer: 1,
  },
  {
    id: 'U-A1-4',
    level: 'A1',
    type: 'functional',
    context: 'Someone says: “Nice to meet you.”',
    question: bestReply,
    options: ['Goodbye.', 'What’s your address?', 'I’m hungry.', 'Nice to meet you too.'],
    answer: 3,
    translations: {
      bn: 'কেউ বললেন, আপনার সঙ্গে দেখা হয়ে ভালো লাগল (“Nice to meet you.”)। সবচেয়ে ভালো উত্তর কোনটি?',
      hi: 'किसी ने कहा कि आपसे मिलकर अच्छा लगा (“Nice to meet you.”)। सबसे अच्छा जवाब क्या है?',
    },
  },
  {
    id: 'U-A1-5',
    level: 'A1',
    type: 'grammar',
    context: 'They ___ football every Sunday.',
    question: 'Choose the missing word.',
    options: ['plays', 'play', 'playing'],
    answer: 1,
  },
  {
    id: 'U-A1-6',
    level: 'A1',
    type: 'vocabulary',
    question: 'Which word is the opposite of “big”?',
    options: ['tall', 'long', 'heavy', 'small'],
    answer: 3,
    translations: {
      bn: '“big” শব্দটির বিপরীত শব্দ কোনটি?',
      hi: '“big” का उल्टा शब्द कौन सा है?',
    },
  },

  // ── A2 ──
  {
    id: 'U-A2-1',
    level: 'A2',
    type: 'vocabulary',
    question: 'What does “expensive” mean?',
    options: ['very old', 'costing a lot of money', 'easy to find', 'made by hand'],
    answer: 1,
    translations: {
      bn: '“expensive” শব্দটির মানে কী?',
      hi: '“expensive” शब्द का क्या मतलब है?',
    },
  },
  {
    id: 'U-A2-2',
    level: 'A2',
    type: 'meaning',
    context: 'I’m looking forward to the weekend.',
    question: speakerMeans,
    options: [
      'I am worried about the weekend.',
      'I forgot about the weekend.',
      'I am happy that the weekend is coming.',
      'I am working this weekend.',
    ],
    answer: 2,
    translations: {
      bn: '“আমি সপ্তাহান্তের জন্য অধীর আগ্রহে অপেক্ষা করছি।” — বক্তা কী বোঝাতে চাইছেন?',
      hi: '“मैं सप्ताहांत का बेसब्री से इंतज़ार कर रहा हूँ।” — बोलने वाले का क्या मतलब है?',
    },
  },
  {
    id: 'U-A2-3',
    level: 'A2',
    type: 'grammar',
    context: 'Yesterday we ___ to the cinema.',
    question: 'Choose the missing word.',
    options: ['go', 'gone', 'going', 'went'],
    answer: 3,
  },
  {
    id: 'U-A2-4',
    level: 'A2',
    type: 'functional',
    context: 'You are late for class.',
    question: 'What do you say?',
    options: ['Sorry I’m late.', 'You’re welcome.', 'See you later.', 'Never mind.'],
    answer: 0,
    translations: {
      bn: 'আপনি ক্লাসে দেরি করে এসেছেন। — আপনি কী বলবেন?',
      hi: 'आप कक्षा में देर से पहुँचे हैं। — आप क्या कहेंगे?',
    },
  },
  {
    id: 'U-A2-5',
    level: 'A2',
    type: 'grammar',
    context: 'This bag is ___ than that one.',
    question: 'Choose the missing word.',
    options: ['cheap', 'cheaper', 'cheapest', 'more cheap'],
    answer: 1,
  },
  {
    id: 'U-A2-6',
    level: 'A2',
    type: 'meaning',
    context: 'The shop is closed on Sundays.',
    question: 'What does this mean?',
    options: [
      'The shop opens late on Sunday.',
      'The shop is busy on Sunday.',
      'The shop is near.',
      'You cannot buy things there on Sunday.',
    ],
    answer: 3,
    translations: {
      bn: '“দোকানটি রবিবার বন্ধ থাকে।” — এর মানে কী?',
      hi: '“दुकान रविवार को बंद रहती है।” — इसका क्या मतलब है?',
    },
  },

  // ── B1 ──
  {
    id: 'U-B1-1',
    level: 'B1',
    type: 'vocabulary',
    question: 'What does “reliable” mean?',
    options: [
      'very fast',
      'new and modern',
      'able to be trusted to do what is expected',
      'difficult to use',
    ],
    answer: 2,
  },
  {
    id: 'U-B1-2',
    level: 'B1',
    type: 'meaning',
    context: 'I’d rather stay at home tonight.',
    question: speakerMeans,
    options: [
      'I prefer to stay at home.',
      'I must stay at home.',
      'I never stay at home.',
      'I stayed at home.',
    ],
    answer: 0,
  },
  {
    id: 'U-B1-3',
    level: 'B1',
    type: 'grammar',
    context: 'If I ___ more time, I would learn to swim.',
    question: 'Choose the missing word.',
    options: ['have', 'had', 'will have', 'would have'],
    answer: 1,
  },
  {
    id: 'U-B1-4',
    level: 'B1',
    type: 'functional',
    context: 'A colleague asks: “Would you mind opening the window?” You are happy to help.',
    question: bestReply,
    options: ['Yes, I mind.', 'I don’t think so.', 'It doesn’t matter.', 'Not at all.'],
    answer: 3,
  },
  {
    id: 'U-B1-5',
    level: 'B1',
    type: 'grammar',
    context: 'I have lived in this city ___ 2019.',
    question: 'Choose the missing word.',
    options: ['for', 'from', 'since', 'during'],
    answer: 2,
  },
  {
    id: 'U-B1-6',
    level: 'B1',
    type: 'meaning',
    context: 'He gave up smoking last year.',
    question: 'What does this mean?',
    options: [
      'He started smoking.',
      'He stopped smoking.',
      'He smokes less.',
      'He wants to smoke.',
    ],
    answer: 1,
  },

  // ── B2+ ──
  {
    id: 'U-B2-1',
    level: 'B2+',
    type: 'vocabulary',
    question: 'What does “reluctant” mean?',
    options: ['unwilling to do something', 'very eager', 'easily frightened', 'unable to speak'],
    answer: 0,
  },
  {
    id: 'U-B2-2',
    level: 'B2+',
    type: 'meaning',
    context: 'The project is anything but finished.',
    question: 'What does this mean?',
    options: [
      'The project is nearly finished.',
      'Only the project is finished.',
      'The project is far from finished.',
      'Everything is finished except the project.',
    ],
    answer: 2,
  },
  {
    id: 'U-B2-3',
    level: 'B2+',
    type: 'grammar',
    context: 'By the time we arrived, the film ___.',
    question: 'Choose the missing words.',
    options: [
      'already started',
      'has already started',
      'was already starting',
      'had already started',
    ],
    answer: 3,
  },
  {
    id: 'U-B2-4',
    level: 'B2+',
    type: 'functional',
    context: 'In a meeting, you want to disagree politely.',
    question: 'What do you say?',
    options: [
      'That’s wrong.',
      'I see your point, but I’m not sure that would work.',
      'I don’t care about that.',
      'You always say that.',
    ],
    answer: 1,
  },
  {
    id: 'U-B2-5',
    level: 'B2+',
    type: 'grammar',
    context: 'Not only ___ late, but he also forgot the documents.',
    question: 'Choose the missing words.',
    options: ['he was', 'was he', 'he is', 'did he'],
    answer: 1,
  },
  {
    id: 'U-B2-6',
    level: 'B2+',
    type: 'meaning',
    context: 'She could hardly hear the speaker.',
    question: 'What does this mean?',
    options: [
      'It was very difficult for her to hear.',
      'She heard very clearly.',
      'She did not want to listen.',
      'She heard a hard sound.',
    ],
    answer: 0,
  },
]

// A short ladder, taken in this order. Speech is not scored yet, so it cannot adapt.
const speak: Omit<SpeakItem, 'stage'>[] = [
  {
    id: 'S-1',
    level: 'FOUNDATION',
    prompt: 'Tell me your name.',
    modelAnswer: 'My name is Rahul.',
    translations: { bn: 'আপনার নাম বলুন।', hi: 'अपना नाम बताइए।' },
  },
  {
    id: 'S-2',
    level: 'A1',
    prompt: 'Where are you from?',
    modelAnswer: 'I am from Kolkata.',
    translations: { bn: 'আপনি কোথা থেকে এসেছেন?', hi: 'आप कहाँ से हैं?' },
  },
  {
    id: 'S-3',
    level: 'A2',
    prompt: 'Tell me something about yourself.',
    modelAnswer: 'I live with my family. I like music, and I want to speak English well.',
    translations: { bn: 'নিজের সম্পর্কে কিছু বলুন।', hi: 'अपने बारे में कुछ बताइए।' },
  },
]

export const itemBank: readonly PlacementItem[] = [
  ...listen.map((item): ListenItem => ({ ...item, stage: 'LISTEN' })),
  ...understand.map((item): UnderstandItem => ({ ...item, stage: 'UNDERSTAND' })),
  ...speak.map((item): SpeakItem => ({ ...item, stage: 'SPEAK' })),
]

const itemsById = new Map(itemBank.map((item) => [item.id, item]))

export function findItem(id: string | null | undefined): PlacementItem | undefined {
  return id ? itemsById.get(id) : undefined
}
