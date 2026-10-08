import type { CurriculumTexts, WeekSummary } from '../curriculum'
import { enOutcomes } from './enOutcomes'
import { withOutcomes } from './withOutcomes'

const week = (goal: string, context: string, challenge: string): WeekSummary => ({
  goal,
  context,
  challenge,
})

/**
 * The course in English — the source the other languages are written from.
 * The weeks are the "50-Week Real-Life Context Map". Section names 1–5 are the short names from
 * the design; 6–10 were written to match them and are open to change.
 * An admin can reword any of it under Admin › Curriculum; this is what ships.
 * TODO(content): age-aware versions of each week (children, teenagers, adults).
 */
export const en: CurriculumTexts = {
  sections: [
    'Start Communicating',
    'My Everyday World',
    'Make Choices and Explain',
    'Handle Everyday Interactions',
    'Sustain Conversations',
    'Share Experiences and Plans',
    'Express Thoughts and Feelings',
    'Tell Stories and Explain Ideas',
    'Communicate in the Real World',
    'Communicate Independently',
  ],
  weeks: withOutcomes(enOutcomes, [
    // Section 1
    week(
      'I can say hello and introduce myself.',
      'Meeting someone for the first time',
      'Greet someone, say your name and respond to a greeting.',
    ),
    week(
      'I can get to know someone.',
      'A new classmate, neighbour or colleague',
      'Ask and answer simple questions about identity, home and work or study.',
    ),
    week(
      'I can talk about my family.',
      'Introducing my family to someone',
      'Describe family members and explain how they are related to you.',
    ),
    week(
      'I can talk about what I like.',
      'Getting to know someone over shared interests',
      'Ask about likes and dislikes and find something in common.',
    ),
    week(
      'I can introduce myself confidently.',
      'Introducing myself at a school, club or workplace event',
      'Give a short personal introduction and answer follow-up questions.',
    ),
    // Section 2
    week(
      'I can describe people.',
      'Describing someone to a friend',
      'Describe appearance and personality so another person can identify them.',
    ),
    week(
      'I can describe things around me.',
      'Finding a missing object',
      'Describe an object’s appearance, location and ownership.',
    ),
    week(
      'I can talk about my home and neighbourhood.',
      'Showing someone around my home or area',
      'Describe familiar places and explain where things are.',
    ),
    week(
      'I can talk about my daily routine.',
      'Sharing a typical day with a friend',
      'Explain what you usually do and when you do it.',
    ),
    week(
      'I can describe what is happening now.',
      'Explaining a scene in a photo or video call',
      'Describe actions taking place and ask what someone is doing.',
    ),
    // Section 3
    week(
      'I can talk about food and choices.',
      'Choosing food for a meal with someone',
      'Discuss preferences, describe food and make simple choices.',
    ),
    week(
      'I can express how I feel.',
      'Talking to someone about how my day went',
      'Describe feelings, give a reason and respond to another person’s feelings.',
    ),
    week(
      'I can compare things and make choices.',
      'Choosing between two products or activities',
      'Compare options and explain which one you prefer.',
    ),
    week(
      'I can talk about what I can and cannot do.',
      'Planning an activity with a friend',
      'Explain abilities, ask about possibilities and request permission.',
    ),
    week(
      'I can explain simple things.',
      'Explaining how I do something familiar',
      'Describe a simple process and give reasons or examples.',
    ),
    // Section 4
    week(
      'I can start and join a conversation.',
      'Meeting people at a social gathering',
      'Start small talk, show interest and introduce people.',
    ),
    week(
      'I can ask for help and information.',
      'Finding something in an unfamiliar place',
      'Ask politely, understand directions and request clarification.',
    ),
    week(
      'I can make requests and suggestions.',
      'Making a plan with a friend or colleague',
      'Suggest an idea, make a request and accept or decline politely.',
    ),
    week(
      'I can agree and disagree politely.',
      'Discussing what to do together',
      'Express agreement, give a different opinion and explain why.',
    ),
    week(
      'I can handle everyday transactions.',
      'Ordering at a café or food counter',
      'Place an order, ask about options, respond to questions and complete the interaction.',
    ),
    // Section 5
    week(
      'I can ask better questions.',
      'Interviewing someone about their interests or experiences',
      'Ask relevant questions and use follow-up questions to get more information.',
    ),
    week(
      'I can listen and respond naturally.',
      'Catching up with a friend after some time',
      'Understand the main message, acknowledge it and respond appropriately.',
    ),
    week(
      'I can keep a conversation going.',
      'Having a conversation while travelling or waiting together',
      'Add details, ask related questions and avoid ending the conversation too quickly.',
    ),
    week(
      'I can handle misunderstandings.',
      'A phone conversation with unclear information',
      'Ask someone to repeat, clarify or explain something in a different way.',
    ),
    week(
      'I can have an unscripted conversation.',
      'Meeting someone unexpectedly',
      'Respond to unexpected questions and sustain a conversation without a prepared script.',
    ),
    // Section 6
    week(
      'I can talk about yesterday.',
      'Sharing what happened yesterday',
      'Describe completed activities and ask someone about theirs.',
    ),
    week(
      'I can share a memorable experience.',
      'Telling someone about a special day or event',
      'Narrate what happened, describe reactions and explain why it mattered.',
    ),
    week(
      'I can talk about future plans.',
      'Discussing plans for the coming weekend or holiday',
      'Explain intentions, arrangements and predictions.',
    ),
    week(
      'I can talk about changes in my life.',
      'Catching up with someone I haven’t seen recently',
      'Explain what has changed and compare life before and now.',
    ),
    week(
      'I can discuss plans and make decisions.',
      'Planning a trip or group activity',
      'Consider alternatives, give advice and agree on a plan.',
    ),
    // Section 7
    week(
      'I can express and explain my opinion.',
      'Discussing a topic I care about',
      'State an opinion, support it with reasons and give an example.',
    ),
    week(
      'I can respond to people’s feelings and experiences.',
      'Supporting a friend who has had a difficult day',
      'Express sympathy, ask thoughtful questions and respond sensitively.',
    ),
    week(
      'I can disagree respectfully.',
      'A friendly discussion about a debatable choice',
      'Acknowledge another viewpoint, disagree politely and support your position.',
    ),
    week(
      'I can discuss problems and solutions.',
      'Solving a practical problem with someone',
      'Explain the problem, identify possible causes and suggest solutions.',
    ),
    week(
      'I can persuade someone.',
      'Convincing a friend or team to consider my idea',
      'Explain benefits, respond to objections and negotiate.',
    ),
    // Section 8
    week(
      'I can describe something in detail.',
      'Helping someone imagine a place or object',
      'Give enough detail for someone to picture what you are describing.',
    ),
    week(
      'I can tell an interesting story.',
      'Sharing something surprising that happened to me',
      'Set the scene, sequence events and keep the listener interested.',
    ),
    week(
      'I can explain how to do something.',
      'Teaching someone a task or explaining how something works',
      'Give clear instructions in a logical order.',
    ),
    week(
      'I can connect my ideas clearly.',
      'Giving a short talk about an experience or topic',
      'Organise ideas using linking expressions and explain relationships between them.',
    ),
    week(
      'I can explain and summarise information.',
      'Telling someone about a video, article or conversation',
      'Identify the main points and explain them in simpler, connected language.',
    ),
    // Section 9
    week(
      'I can communicate while travelling.',
      'A journey through an airport, railway station or hotel',
      'Ask for information, understand instructions and handle a travel-related problem.',
    ),
    week(
      'I can communicate in an educational setting.',
      'Participating in a class, course or group discussion',
      'Ask questions, explain an answer and contribute to a discussion.',
    ),
    week(
      'I can communicate at work.',
      'A workplace meeting or project discussion',
      'Introduce responsibilities, give an update, ask questions and discuss next steps.',
    ),
    week(
      'I can communicate through digital channels.',
      'A phone call, voice message or video meeting',
      'Communicate clearly without relying on face-to-face visual cues.',
    ),
    week(
      'I can handle an unexpected situation.',
      'A service problem or an urgent practical difficulty',
      'Explain what happened, ask for help, make a complaint or negotiate a solution.',
    ),
    // Section 10
    week(
      'I can communicate clearly and accurately.',
      'A conversation where details matter',
      'Explain information precisely, use appropriate time references and correct misunderstandings.',
    ),
    week(
      'I can express the same idea in different ways.',
      'Explaining something when I cannot remember the exact word',
      'Use alternative vocabulary, paraphrase and explain unfamiliar ideas.',
    ),
    week(
      'I can speak more fluently and naturally.',
      'A five-minute conversation with a new person',
      'Speak in connected thought groups, use natural stress and reduce unnecessary hesitation.',
    ),
    week(
      'I can think and respond in English.',
      'Joining a conversation about an unfamiliar topic',
      'Understand the discussion, organise thoughts and respond without depending on a prepared script.',
    ),
    week(
      'I can communicate independently in everyday life.',
      'A full day of real-world English challenges',
      'Integrate listening, speaking, interaction, storytelling, problem-solving and discussion across changing situations.',
    ),
  ]),
}
