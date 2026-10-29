// Static game data for Gazillionaire Deluxe (web port).
// Names, flavour text and art come from the original 1996 game; numeric tuning is re-derived.

const SLOTS = [[72, 95], [286, 136], [522, 75], [370, 258], [110, 332], [328, 392], [550, 327]];

const PLANET_DEFS = [
  { id: 'Vexx', sp: 'tax', who: 'Imperial Magistrate', img: 'asian', img2: 'asian2', btn: 'Petition for Lower Taxes',
    blurb: 'Vexx is the capital of Kukubia and the seat of the Imperial Magistrate.',
    desc: 'While on Vexx you can petition the government for lower import tariffs, export tariffs and passenger taxes.' },
  { id: 'Pyke', sp: 'engine', who: 'L-Tech Sales Rep.', img: 'mech', img2: 'mech2', btn: 'Purchase a New Faster Engine',
    blurb: 'Pyke is a major industrial center and the only place to purchase new L-Tech engines.',
    desc: 'Pyke is home to L-Tech, the largest engine manufacturer in Kukubia.' },
  { id: 'Mira', sp: 'sages', who: 'Grand Sage', img: 'monk', img2: 'monk1', btn: 'Ask To See Grand Sages',
    blurb: 'Mira is the heart of Kukubia\'s religion and sacred resting spot of the Quaso Mutta.',
    desc: 'Mira is the oldest and most mystical of all the planets in Kukubia. While on Mira, you may pay a visit to the renowned Grand Sages and ask them for a blessing, which can help to turn a bad luck streak into good fortune.' },
  { id: 'Stye', sp: 'union', who: 'Trader\'s Union Official', img: 'loan1', img2: 'loan2', btn: 'Ask for Financial Assistance',
    blurb: 'Stye is the financial hub of the system and home of the Trader\'s Union.',
    desc: 'Stye is the financial capital of Kukubia and where the Trader\'s Union Headquarters is located. While on Stye, you can ask the Trader\'s Union for financial assistance. If you are lucky, they may lower the interest rate on your loan, increase your credit limit, or raise the interest rate on your savings account.' },
  { id: 'Loro', sp: 'leave', who: 'Peelia Veelia, Queen of Loro', img: 'peelia', img2: 'peelia2', btn: 'Grant Crew Ship Leave',
    blurb: 'Loro is renowned throughout Kukubia as a great vacation spot.',
    desc: 'Loro is known throughout Kukubia as the Pleasure Planet. It is the most popular resort/vacation spot in the entire system. While on Loro, you can grant your crew ship leave. This will boost their morale and make for a better working relationship.' },
  { id: 'Zile', sp: 'zinn', who: 'Mr. Zinn', img: 'zinn', img2: 'zinn2', btn: 'Ask Zinn for a Favor',
    blurb: 'Zile is a wealthy merchant\'s planet and home to Mr. Zinn.',
    desc: 'Zile is Mr. Zinn\'s home planet. While on Zile, you may pay Mr. Zinn a visit and ask him for a favor. If you are lucky, he will lower the interest rate on your loan or increase your credit limit.' },
  { id: 'Frac', sp: 'insure', who: 'Your Insurance Agent', img: 'insure', img2: 'insure2', btn: 'Ask for Lower Premiums',
    blurb: 'Frac is the headquarters of the Voyager\'s Insurance Company.',
    desc: 'Frac is a bustling business center. While on Frac you can pay a visit to the Voyager\'s Insurance Company headquarters and ask for a reduction in your weekly premiums.' },
  { id: 'Tilo', sp: 'gamble', who: 'Casino Dealer', img: 'dealer1', img2: 'dealer2', btn: 'Try Your Luck at Gambling',
    blurb: 'Tilo is the gambler\'s planet packed with wall to wall casinos.',
    desc: 'Tilo is the only planet in Kukubia with legalized gambling. If you\'re feeling lucky, you can try your hand at Tilo\'s most popular game: ALL OR NOTHING. If you win, you\'ll double whatever you bet. If you lose, the fun is over. NOTE: Under Imperial Law, no one is allowed to gamble more than 5% of their total cash in one week.' },
  { id: 'Queg', sp: 'queg', who: 'Lady Cornucopia', img: 'cornu1', img2: 'cornu2', btn: 'Purchase from Lady Cornucopia',
    blurb: 'Queg is the infamous smuggler\'s haven.',
    desc: 'Queg is the infamous renegade planet. It is here that the galaxy\'s most notorious gangsters come to unload their wares.' },
  { id: 'Xeen', sp: 'mech', who: 'Your Mechanic', img: 'mechan1', img2: 'mechan2', btn: 'Upgrade Your Ship',
    blurb: 'Xeen is one giant junkyard filled with spare ship parts and brilliant mechanics.',
    desc: 'Xeen is one giant junkyard filled with spare parts and brilliant mechanics.' },
  { id: 'Ooom', sp: 'sooth', who: 'Soothsayer', img: 'sooth3', img2: 'sooth1', btn: 'Have Your Fortune Read',
    blurb: 'Ooom is the mystical fortune teller\'s planet.',
    desc: 'Ooom is known throughout the galaxy as the Fortune Teller\'s Planet. This is because the Soothsayers of Ooom have the uncanny ability to predict the future by scanning one\'s aura for positive or negative energy.' },
  { id: 'Hork', sp: 'agent', who: 'Your Agent', img: 'agent1', img2: 'agent2', btn: 'Do it!',
    blurb: 'Hork is the media capital of Kukubia.',
    desc: 'Hork is the media capital of Kukubia, affectionately known as Horkywood. You have an agent, whose job is to get your company free publicity.' },
  { id: 'Bass', sp: 'broker', who: 'Your Stock Broker', img: 'broker1', img2: 'broker2', btn: 'Visit Your Stock Broker',
    blurb: 'Bass is a playground for stock market analysts.',
    desc: 'Bass is where all the stock brokers, market analysts and traders congregate to exchange information. If your stock broker is not too busy, she can provide you with detailed information on market conditions across Kukubia.' },
  { id: 'Nosh', sp: 'fuel', who: 'Zobrok the Fuel Wholesaler', img: 'zobrok1', img2: 'zobrok2', btn: 'Pay a Visit to Zobrok',
    blurb: 'Nosh is known as the fuel depot for the entire system.',
    desc: 'Welcome to Nosh, the fuel depot of Kukubia. Zobrok, a big time wholesaler, sells fuel well below the retail price.' }
];

// [name, base price per ton, sound]
const GOODS = [
  ['Cantaloupe', 14, 'cantalou'], ['Jelly Beans', 28, 'jellybea'], ['Moon Ferns', 46, 'moonfern'],
  ['Frog Legs', 75, 'frogleg'], ['Whip Cream', 115, 'whipcrem'], ['Babel Seeds', 170, 'babel'],
  ['Diapers', 250, 'diapers'], ['Umbrellas', 360, 'umbrella'], ['Toasters', 520, 'toasters'],
  ['Polyester', 740, 'polyestr'], ['Hair Tonic', 1050, 'tonic'], ['Lava Lamps', 1500, 'lavalamp'],
  ['Oxygen', 2150, 'oxygen'], ['Oggle Sand', 3100, 'oggle'], ['Kryptoons', 4500, 'kryptoon'],
  ['X Fuels', 6500, 'xfuel'], ['Gems', 9500, 'gems'], ['Exotic', 14000, 'exotic']
];

// name, size(tons), price
const SHIPS = [
  ['Stinger XII', 30, 0], ['Fly Catcher', 50, 28000], ['Le Rock', 80, 75000], ['Whaler 2000', 120, 190000],
  ['Retina', 180, 480000], ['Cerebralis', 270, 1150000], ['The Globulizer', 400, 2900000],
  ['Locomotis', 600, 7200000], ['Mantagon', 900, 17500000], ['Kegger', 1350, 43000000],
  ['Worm Shuttle', 2000, 105000000], ['Squidocity', 3000, 260000000]
];

const LEVELS = [
  { name: 'Easy', goal: 1000000 },
  { name: 'Normal', goal: 10000000 },
  { name: 'Hard', goal: 100000000 },
  { name: 'Expert', goal: 1000000000 }
];

const AI_DEFS = [
  { name: 'Bassoon Brothers Inc.', style: 'steady' },
  { name: 'Hapa Hauling Ltd.', style: 'greedy' },
  { name: 'Peelia Imports Inc.', style: 'steady' },
  { name: 'Gogg Galactic Freight', style: 'bold' },
  { name: 'Mono Cheezo & Sons', style: 'bold' },
  { name: 'Quaso Mutta Trading', style: 'greedy' }
];

const HAZARDS = [
  { id: 'rebels', t: 'Chichi Bobo Rebels!', img: 'rebels', snd: 'rebels', kind: 'toll' },
  { id: 'darleen', t: 'Darleen Smugglers!', img: 'darleen', snd: 'darleen', kind: 'steal' },
  { id: 'bandits', t: 'Baid-Rowel Bandits!', img: 'bandits', snd: 'bandits', kind: 'stealdmg' },
  { id: 'moog', t: 'Mooglers!', img: 'mooglers', snd: 'moogler', kind: 'dmg',
    x: 'You stumble into a crowd of mad Mooglers, a rowdy group of anarchists. To prove their point, they trash your ship, causing {$} kubars worth of damage.' },
  { id: 'fez', t: 'Fez Fa Fa!', img: 'fezfafa', snd: 'fezfafa', kind: 'dmg',
    x: 'You happen to run into a herd of ever hungry Fez Fa Fa. With unyielding appetites, these wild beasts break into your ship and begin gobbling up everything in sight. Their corrosive saliva winds up causing {$} kubars worth of damage to your ship.' },
  { id: 'hungo', t: 'Hungo Warriors!', img: 'hungo', snd: 'hungo', kind: 'steal' },
  { id: 'cylet', t: 'Cylet Mind Buggers!', img: 'cylet', snd: 'cylet', kind: 'dmg',
    x: 'You stumble into the mental channel of the Cylet Mind Buggers. Without even boarding your ship, they steal the brains of two of your crew members and meltdown your primary navigation-circuits in the process, causing {$} kubars worth of damage.' },
  { id: 'lippo', t: 'Lippo Jungies!', img: 'lippo', snd: 'lippo', kind: 'dmg',
    x: 'You are unlucky enough to run smack into a herd of mindless Lippo Jungies. These huge space-whales smack right into your ship, inflicting {$} kubars worth of damage.' },
  { id: 'wicky', t: 'Wicky Wicks!', img: 'wicky', snd: 'wicky', kind: 'steal' },
  { id: 'pirates', t: 'Space Pirates!', img: 'bronap', snd: 'pirates', kind: 'steal' },
  { id: 'meteor', t: 'Meteor Storm!', img: 'meteor', snd: 'meteor', kind: 'dmg',
    x: 'A meteor storm pummels your ship! Your ship\'s hull is badly damaged, and you must pay {$} kubars to have it repaired.' },
  { id: 'solar', t: 'Solar Storm!', img: 'storm', snd: 'storm', kind: 'dmg',
    x: 'You are unable to avoid the solar storm, and it thrashes your ship. Your expensive L-Tech engine is nearly shredded, and you must pay {$} kubars to have it repaired.' },
  { id: 'hurr', t: 'Space Hurricane!', img: 'storm', snd: 'storm', kind: 'dmg',
    x: 'You encounter a space hurricane, and it batters your ship! Your ship\'s guidance system suffers serious damage, and you must pay {$} kubars to have it repaired.' },
  { id: 'typhoon', t: 'Stellar Typhoon!', img: 'storm', snd: 'storm', kind: 'dmg',
    x: 'You stumble into a stellar typhoon, and it pounds your ship. Your rear thrusters are nearly torn apart, and you must pay {$} kubars to have them repaired.' },
  { id: 'dexxy', t: 'Dexxy Gas!', img: 'dexxygas', snd: 'dexxygas', kind: 'dmg',
    x: 'You get caught in a corrosive cloud of Dexxy Gas. Your ship\'s exterior is badly burned, and you must pay {$} kubars to have it repaired.' },
  { id: 'mippi', t: 'Mippi Weeds!', img: 'mippi', snd: 'mippi', kind: 'dmg',
    x: 'You run smack into a cluster of Mippi Weeds. Your ship is covered in these sticky organisms, and you must pay {$} kubars to have them removed.' },
  { id: 'bollup', t: 'Bollup Juice!', img: 'bollup', snd: 'bollup', kind: 'dmg',
    x: 'You are hit by a stream of acidic Bollup Juice. This deadly liquid takes a bite out of your ship, and you must pay {$} kubars to have it repaired.' },
  { id: 'vapor', t: 'Wess Vapor!', img: 'vapor', snd: 'vapor', kind: 'dmg',
    x: 'Your ship is engulfed in a sea of Wess Vapor. This radioactive debris contaminates your vessel, and you must pay {$} kubars to have it cleaned.' },
  { id: 'whirl', t: 'Stellar Whirl Pool!', img: 'whirl', snd: 'whirl', kind: 'dmg',
    x: 'You get sucked into a giant Stellar Whirl Pool. Your ship is squeezed and crunched, and you must pay {$} kubars to have it rebuilt.' },
  { id: 'bobble', t: 'Bobble Warp!', img: 'bobble', snd: 'bobble', kind: 'dmg',
    x: 'You get slammed by a Bobble Warp, a dangerous break in the time/space continuum. By the time you come back out the other end, your ship is all bent out of shape, and you must pay {$} kubars to have it re-shaped.' }
];

const NEWS_FLAVOR = [
  'This morning, Supreme Commander Dred Nicolson gave a speech about soap. Emperor Dred\'s great fear is that one day the galaxy will simply run out of soap.',
  'The Governor of {P} was arraigned today on charges of taking bribes and kickbacks from local industrialists.',
  'The indigenous population of {P} held a candlelight vigil in honor of Chichi Bobo, who they believe is a martyr to the cause of planetary independence.',
  'The streets of {P} turned into a battle ground last night as thousands of laborers rioted. They were protesting the harsh working conditions and low pay.',
  'The indigenous creatures of {P} performed their annual Moxy Milk bath rituals, which they believe will drive off the evil spirits and restore harmony to their souls.',
  'Five top cabinet members on {P} have resigned after their party refused to raise the minimum wage for workers on the planet.',
  'The Environmental Coalition on {P} has come out strongly against the policy of dumping toxic fuel into the planet\'s oceans.',
  'A recent poll shows that {N}% of the population on {P} would rather have two Malakite sandwiches for lunch for 6 months straight than inform a co-worker that he/she has a body odor problem.',
  'A recent poll shows that {N}% of the population on {P} have at least one Lava Lamp in their homes.',
  'A recent poll shows that {N}% of the population on {P} have considered naming at least one of their children Dred.',
  'A recent poll shows that {N}% of the population on {P} have had some form of toe surgery in the past 12 months.',
  'A recent poll shows that {N}% of the population on {P} believes that the government should do more to curb the power of large interplanetary corporations.',
  'Scooter Jay, a notorious smuggler, was caught last night with 200 tons of illegally imported Lava Lamps from the galaxy of Pata Pata Pita. Emperor Dred Nicolson decreed that Scooter Jay will have to pay a one million kubar fine for this transgression.',
  'Quist, a high flying financier, was arraigned in court today on charges of fraud. Apparently, he is being accused of swindling nearly 2 million kubars out of one of his clients.',
  'Yoyo, the well-known gambler, was arrested yesterday after trying to cheat an undercover police officer out of 5,000 kubars.'
];

const HAZARD_NEWS = {
  rebels: 'The Chichi Bobo Rebels are rumored to be gathering near {P}. Ships passing through the area should be prepared to pay a revolutionary tax.',
  darleen: 'Our sources indicate that the Darleen Smugglers are targeting the area around {P}. Apparently, they have cut a deal with Lady Cornucopia, who is willing to purchase everything they can plunder.',
  bandits: 'It appears that {P} is the new stalking grounds for the Baid-Rowel Bandits. We have reports of these remorseless thugs attacking ships while dressed only in designer underpants.',
  moog: '{P} has erupted in flames as hoards of Mooglers riot in the streets. These fanatical anarchists are protesting the prevalence of traffic signs.',
  fez: 'A herd of Fez Fa Fa escaped from their sanctuary last night and are heading towards {P}. These ravenous eating machines have already consumed a woman, her two pet Poffers, and a lawn mower.',
  hungo: 'We have reports that the legendary Hungo Warriors have attacked a freighter orbiting {P}. These extraordinary fighters are known to disguise their ships as asteroids and literally ram into their victims.',
  cylet: 'The Cylet Mind Buggers have been using their incredible mental powers to harass ships around {P}. If you\'re headed in that direction be prepared for a mental assault.',
  lippo: 'Herds of mindless Lippo Jungies are known to be performing their seasonal mating rituals off planet {P} this week. These clumsy space-whales have been known to accidentally crush anything that happens to be in their way.',
  wicky: 'We have reports that a pack of parasitic Wicky Wicks have been sucking the life blood out of ships near {P}. If you are headed for the region next week, you are advised to reconsider your travel plans.',
  pirates: 'A band of space pirates are reported to be looting, pillaging and spray painting silly slogans on ships in the area around {P}.',
  meteor: 'Astronomers warn of a heavy meteor shower in the vicinity of {P} this week.',
  solar: 'A powerful solar storm is building in the space around {P}. Ships with expensive engines should take caution.',
  hurr: 'A space hurricane is churning up the lanes leading to {P}.',
  typhoon: 'A stellar typhoon has been spotted near {P}. Mariners are advised to stay clear.',
  dexxy: 'A thick cloud of corrosive Dexxy Gas is drifting through the space near {P}.',
  mippi: 'Dense patches of Mippi Weeds have been reported near {P}.',
  bollup: 'Bollup Juice geysers are erupting off {P}. This acidic liquid is dangerous to unprotected ships.',
  vapor: 'A cloud of radioactive Wess Vapor is moving in the direction of {P}.',
  whirl: 'A giant Stellar Whirl Pool has opened up near {P}.',
  bobble: 'Scientists report a Bobble Warp in the time/space continuum around {P}.'
};

const MULLS_TIPS = [
  'Never invest in the stock market until you\'ve paid off all your debts.',
  'Always try to fill up your ship\'s cargo bay. It\'s better to make a small profit than no profit at all.',
  'Always look for the commodities with the highest potential profit margin. Cheap goods usually don\'t pay enough to cover your expenses.',
  'Don\'t pay your crew until you absolutely have to. That same money could be in the bank earning interest.',
  'Only invest in stocks which are on an upward trend.',
  'Don\'t purchase a larger ship until you\'ve paid off all of your debts.',
  'If Mr. Zinn or the Trader\'s Union offers to extend your credit limit, always say YES!',
  'Make sure you have a faster engine than your competitors. Speed makes a difference.',
  'Always read the daily news and weather reports. If they predict trouble, buy insurance before travelling.',
  'Always try the planet specials. They tend to do more good than harm.',
  'Luck runs in streaks. If you\'re on a bad luck streak, make sure to buy insurance before travelling.',
  'Always fill up on fuel when the price is cheap.',
  'Make sure to raise your passenger ticket prices and advertise. The combination of high ticket prices and advertising can bring in more money.',
  'Never allow your crew to go on strike. When they demand to be paid, you\'d better pay them.',
  'Mr. Zinn typically offers a better rate than the Trader\'s Union.'
];

const STARS = ['stars1', 'stars2', 'stars3', 'stars4', 'stars5', 'stars6'];

const SOOTH_TEXT = [
  'The Soothsayer lays his sticky yellow fingers against your forehead and starts screaming wildly! He shouts that you are cursed and headed for death and destruction.',
  'The Soothsayer reports that you have an extremely negative aura and will probably suffer some great calamity.',
  'The Soothsayer informs you that your aura is rather negative, and you should be careful for the next few weeks.',
  'The Soothsayer performs a series of readings and concludes that your aura is slightly on the negative side, but this is nothing to worry about.',
  'After the reading has been completed, the Soothsayer informs you that your aura is average. Your luck could go either way in the near future.',
  'The Soothsayer performs the standard reading and comes back with good news. Your aura is positive. In fact, it\'s well above average.',
  'The Soothsayer explains that your aura is very positive, and the chance of bad luck occurring is rather remote.',
  'The Soothsayer asks you to stand in a bucket of mouth wash. Your energy levels are off the charts! You are truly blessed.'
];

const LUCKY_NOTES = [
  'The Soothsayer explains that your aura is positive. On your way home, you find a wallet stuffed with {$} kubars and no ID. The police say you can keep the money.',
  'The Soothsayer explains that your aura is above average. That night, you find out one of your passengers was a wealthy foreign monarch, and he tips you {$} kubars.',
  'The Soothsayer explains that you have an extremely positive aura. Only minutes later you receive a phone call from the Governor of {P}, pledging {$} kubars in financial aid with no strings attached!'
];
