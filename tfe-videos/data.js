// @ts-check

import { Camera, NTSC24, NTSC30, NTSC60 } from "./modules/Camera.js";
import { Clip } from "./modules/Clip.js";
import { Person } from "./modules/Person.js";
import { Timeline } from "./modules/Timeline.js";
import { TimeSource } from "./modules/TimeSource.js";
import { MCToonDjiUpload, TikTokVideo, YouTubeVideo } from "./modules/Video.js";

/** Timeline object that the videos are placed on. It will perform some consistency checks on the video clips and produce the output graphics. */
export const timeline = new Timeline();

/** Various time sources. */
const ts = {
	digitalRead : new TimeSource("read off a digital clock with NTP or GPS source"          , -20, 60*1000-1 + 553),
	compromised : new TimeSource("a digital clock that is off by a known number of minutes" , -20-60*1000, 120*1000-1 + 553),
	/** A digital clock updated from NTP or GPS. */
	digital     : new TimeSource("a digital clock with NTP or GPS source"                   , -20, 60*1000-1 + 53),
	digitalFlip : new TimeSource("a digital clock with NTP or GPS incremented on video"     , -20, +53),
	/** iPhone clock set from NTP (time.apple.com) via Starlink with high latency. */
	iPhoneSl    : new TimeSource("iPhone on Starlink"                                       , -100, 60*1000-1 + 133),
	/** A video aligned with a GPS track node +/-60 secs. */
	gps60       : new TimeSource("estimated from GPS track (+/-60s)"                        , -60*1000, +60*1000),
	/** A video aligned with a GPS track node +/-90 secs. */
	gps90       : new TimeSource("estimated from GPS track (+/-90s)"                        , -90*1000, +90*1000),
	/** A video aligned via wall clock +/-60 secs. */
	analog      : new TimeSource("wall clock reading"                                       , -60*1000, +60*1000),
	/** Can be 4 minutes too early or 10 minutes too late. */
	roundabout  : new TimeSource("someone saying the time without checking any time piece"  , -4*60*1000, +10*60*1000),
	/** Can be 4 minutes too early or 1 second to late. */
	almost      : new TimeSource("someone saying it is almost full hour/half hour"          , -4*60*1000, 1000),
	/** Chat might be 4 seconds late (on top of only being precise to the minute). */
	ytChat      : new TimeSource("HH:mm mentioned in YouTube live chat"                     , 0, 64*1000),
	/** E.g. at full hour, Westminster first plays a jingle, then counts the hours. */
	churchBells : new TimeSource("stroke of a church clock"                                 , -2*1000, +3*1000),
	sun         : new TimeSource("guess based on the sun angle (+/- 7 minutes)"             , -7*60*1000, +7*60*1000),
	moon        : new TimeSource("guess based on location and azimuth of moon in the sky"   , -7*60*1000, +7*60*1000),
	takeoff     : new TimeSource("departure (break release) time synced to a take-off"      , 0, 20*60*1000),
	eta         : new TimeSource("extrapolated from ETA on in-flight entertainment screen"  , -61*1000, +61*1000),
	hourMention : new TimeSource("someone mentions what full hour it is"                    , -10*60*1000, +10*60*1000),
};

/** List of the people having participated in TFE. */
const peeps = {
	/** Austin Whitsitt */
	austin   : new Person("Austin Whitsitt"  , "Witsit Gets It", "#FF7B0F", "https://scontent-ham3-1.cdninstagram.com/v/t51.2885-19/459065008_841785001478610_1172127654038584329_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_ht=scontent-ham3-1.cdninstagram.com&_nc_cat=106&_nc_ohc=7-y942EQ5wwQ7kNvgEo_H5m&_nc_gid=34935ae5f4b14fd9a61e71d8f7ecd065&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_AYCQImuV3kALvgzd5uQPOO0Fb_KBFKgrh9exLX8b7NbrGw&oe=678C876B&_nc_sid=8b3546"),
	/** Critical Think */
	ct       : new Person(undefined          , "Critical Think", "#C48C54", "https://www.gofundme.com/person/profiles/ca878cf507eb4487a69f315df96f961c_edited_photo_1716676408125.png"),
	/** Dave McKeegan */
	dave     : new Person("Dave McKeegan"    , undefined       , "#FF52AE", "https://cdn.prod.website-files.com/6632de001649f609e3cb01b3/66c737e129229facacc59149_Dave%20McKeegan%20Logo.jpeg"),
	/** Jeran Campanella */
	jeran    : new Person("Jeran Campanella" , "Jeranism"      , "#37B97A", "https://public-sleekbio.b-cdn.net/media/SemaLlMrqoRLtAmukSSlbJ1h72UZI5zY2dCWLu2I.png"),
	/** Jonathan Mariande */
	jonathan : new Person("Jonathan Mariande", undefined       , "#FAE100", "https://scontent-ham3-1.cdninstagram.com/v/t51.2885-19/424428858_1055271645740795_6056614522863728844_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_ht=scontent-ham3-1.cdninstagram.com&_nc_cat=111&_nc_ohc=Z0pAoFuvTZMQ7kNvgFCnt_e&_nc_gid=bf00aa2bbe3146e49e00d1089fcf2990&edm=AOQ1c0wBAAAA&ccb=7-5&oh=00_AYDJIasXIgTMBwfF3eqMKHPit13gPT2VwsxTRVnLpUkFyA&oe=678C6EA4&_nc_sid=8b3546"),
	/** Lisbeth Acosta */
	lisbeth  : new Person("Lisbeth Acosta"   , undefined       , "#3DCC00", "https://d14u0p1qkech25.cloudfront.net/805589948_3747677b-ed86-4a6e-83f2-4e3ac390a2c7_thumbnail_250x250"),
	/** Mark Herman */
	mark     : new Person("Mark Herman"      , undefined       , "#919191", "https://cdn.prod.website-files.com/6632de001649f609e3cb01b3/6721322f23306d5c4f13effa_Mark%20Herman%201x1-p-500.jpeg"),
	/** MCToon */
	mctoon   : new Person("Michael Toon"     , "MCToon"        , "#00a0cc", "https://images.gofundme.com/JegCjzvHmgQ8YY0CQd8ybKXjGkA=/720x405/https://d2g8igdw686xgo.cloudfront.net/82737171_1726241344534852_r.png"),
	/** WheresWally */
	wally    : new Person(undefined          , "WheresWally"   , "#d65e5e", "https://yt3.googleusercontent.com/ytc/AIdro_n4xP1ucejR6MfBMNoC4gXfOiEj7JLerNcHnrk8nTIRYdY=s160-c-k-c0x00ffffff-no-rj"),
	/** Will Duffy */
	will     : new Person("Will Duffy"       , undefined       , "#6060FF", "https://c4ort.com/wp-content/uploads/ultimatemember/188/profile_photo.jpg?1736878802"),
};

/** List of the cameras used during TFE. */
const cams = {
 	/** Austin’s action cam. */
	austinAction   : new Camera(peeps.austin  , true , "GoPro HERO13"),
	/** Critical Think’s action cam. */
	criticalAction : new Camera(peeps.ct      , true , "Austek AT-M40(R/TRW)"),
	/** Critical Think’s phone. */
	criticalPhone  : new Camera(peeps.ct      , true , "Samsung Galaxy S22/23/24 Ultra"),
	/** Critical Think’s laptop. */
	criticalLaptop : new Camera(peeps.ct      , true , "Unknown Laptop"),
	// Dave brought following lenses:
	//   TAMRON  17- 28mm F/2.8 Di III RXD
	//           28- 75mm F/2.8 Di III VXD G2
	//          150-500mm F/5-6.7 Di III VC VXD
	//           70-180mm F/2.8 Di III VXD
	/** Dave’s Insta360 that recorded the sunspot camera. */
	dave360        : new Camera(peeps.dave    , false, "Insta360 X4"),
	/** Dave’s sunspot camera (with details from the video where he goes over the gear he wants to take to Antarctica). It was used with the 150-500mm lens at 500mm. */
	daveSonyA7iii  : new Camera(peeps.dave    , false, "Sony α 7 Ⅲ", "Tamron 150-500mm F/5-6.7 Di Ⅲ VC VXD + KF01.2583V1 Solar Filter + Hood"),
	/** Dave’s secondary camera that was used to record some making-of footage. */
	daveSonyA7iv   : new Camera(peeps.dave    , true , "Sony α 7 Ⅳ"),
	/** Dave’s laptop. */
	daveLaptop     : new Camera(peeps.dave    , true , "Unknown Laptop"),
	/** Jeran’s laptop. */
	jeranPhone     : new Camera(peeps.jeran   , true , "iPhone 15"),
	/** Jeran’s body cam. */
	jeranAction    : new Camera(peeps.jeran   , true , "GoPro HERO12"),
	/** Jeran’s camera. */
	jeranCam       : new Camera(peeps.jeran   , true , "Nikon Coolpix P900 (UV/IR blocker removed)", "125mm F/8 + Filter"),
	/** Jeran’s timelapse camera. */
	jeranTimelapse : new Camera(peeps.jeran   , false, "Afidus ATL-800i 4K Time Lapse"),
	/** Jonathan’s phone. */
	jonathanPhone  : new Camera(peeps.jonathan, true , "Smart Phone"),
	/** Jonathan’s action cam. */
	jonathanAction : new Camera(peeps.jonathan, true , "DJI Osmo Pocket"),
	/** Jonathan’s camera. */
	jonathanCam    : new Camera(peeps.jonathan, true , "Canon EOS-1D X Mark Ⅲ", "Canon EF 16-35mm f/4L IS USM + Circular Polarizer"),
	/** Jonathan’s drone. */
	jonathanDrone  : new Camera(peeps.jonathan, true , "DJI Mavic 2 Pro"),
	/** Lisbeth’s phone. */
	lisbethPhone   : new Camera(peeps.lisbeth , true , "iPhone X or later"),
	/** Lisbeth’s camera. */
	lisbethCam     : new Camera(peeps.lisbeth , true , "Sony α 6400", "Tamron 18-300mm F/3.5-6.3 Di Ⅲ-A VC VXD"),
	/** Mark’s Insta360. */
	mark360        : new Camera(peeps.mark    , true , "Insta360 X4"),
	/** Mark’s phone. */
	markPhone      : new Camera(peeps.mark    , true , "iPhone 6s or newer"),
	/** MCToon’s action cam. */
	mctoonAction   : MCToonDjiUpload.camera
	               = new Camera(peeps.mctoon  , true , "DJI OSMO Action 5 Pro"),
	/** MCToon’s phone. */
	mctoonPhone    : new Camera(peeps.mctoon  , true , "iPhone 12 Pro"),
	/** MCToon’s laptop. */
	mctoonLaptop   : new Camera(peeps.mctoon  , true , "Unknown Laptop"),
	/** MCToon’s camera. */
	mctoonCam      : new Camera(peeps.mctoon  , true , "P1000"),
	/** MCToon’s Insta360. */
	mctoon360      : new Camera(peeps.mctoon  , false, "Insta360 camera"), // TODO: Was this another Insta360 X4?
	/** WheresWally’s Jeranometer camera. */
	wallyAction    : new Camera(peeps.wally   , false, "Austek AT-M40TRW"),
	/** Will’s phone. */
	willPhone      : new Camera(peeps.will    , true , "Samsung Galaxy S23 Ultra"),
	/** Will’s laptop. */
	willLaptop     : new Camera(peeps.will    , true , "Microsoft Surface Laptop Studio"),
	/** Will’s inner Insta360. */
	will360A       : new Camera(peeps.will    , false, "Insta360 X4"),
	/** Will’s outer Insta360. */
	will360B       : new Camera(peeps.will    , false, "Insta360 X4"),
	/** Will’s drone. */
	willDrone      : new Camera(peeps.will    , true , "DJI MINI 4 PRO"),
};

/** List of the videos shot during TFE. */
const vids = {
	// Austin Whitsitt / videos
	austin24hPart1            : new YouTubeVideo(timeline, "Aq2hZzHHxew", "Witsit Gets It", "24 Hour Antarctic Sun (Part 1)", 30585.241, NTSC30, cams.will360B, "2025-01-07T18:33:58Z"),
	austin24hPart2            : new YouTubeVideo(timeline, "cMaRvYt1--A", "Witsit Gets It", "24 Hour Antarctic Sun (Part 2)", 30585.241, NTSC30, cams.will360B, "2025-01-07T18:34:02Z"),
	austin24hPart3            : new YouTubeVideo(timeline, "WUFpxzCPuyU", "Witsit Gets It", "24 Hour Antarctic Sun (Part 3)", 30554.721, NTSC30, cams.will360B, "2025-01-07T18:34:04Z"),
	austin24hTl               : new YouTubeVideo(timeline, "MhmpLVbo4jU", "Witsit Gets It", "24 Hour Sun in Antarctica (360 Degrees Time-Lapse)", 4407.661, NTSC30, cams.will360B, "2025-01-07T18:41:35Z")
		.setTimelapseRate(20),
	// Austin Whitsitt / streams
	austinLive                : new YouTubeVideo(timeline, "xFxzu2reS_o", "Witsit Gets It", "Live from Antarctica - One Small Step for Man, One Giant Leap for Flat Earth", 2918.001, 30, peeps.austin, "2024-12-15T19:42:11Z", "2024-12-15T20:30:40Z"),

	// Critical Think / videos
	criticalFlight1Tl         : new YouTubeVideo(timeline, "Uo_kV3w5dCg", "Critical Think", "Timelapse of flight QF27 10-Dec-2024 en route to The Final Experiment Expedition", 1413.861, 30, cams.criticalAction, "2025-01-13T02:22:41Z")
		.setTimelapseRate(30),
	criticalFlight2Tl         : new YouTubeVideo(timeline, "hc444QdX93U", "Critical Think", "Timelapse of the Flight from Punta Arenas to Union Glacier Left Side View", 517.341, 30, cams.criticalAction, "2024-12-18T16:29:04Z")
		.setTimelapseRate(30),
	criticalFlight2Landing    : new YouTubeVideo(timeline, "DdoUdeEJ9us", "Critical Think", "Landing at Union Glacier - Full Time Video Left Side View", 630.021, 30, cams.criticalAction, "2024-12-18T18:09:37Z"),
	criticalFlight3Tl         : new YouTubeVideo(timeline, "13hXzRjSFh4", "Critical Think", "Timelapse of the Flight from Union Glacier to Punta Arenas Left Side View", 504.341, 30, cams.criticalAction, "2024-12-20T22:26:24Z")
		.setTimelapseRate(30),
	// Critical Think / streams
	criticalBrisbane          : new YouTubeVideo(timeline, "s6qVQRjEhJY", "Critical Think", "Critical Think is live at Brisbane Airport", 34.930, 30, cams.criticalPhone, "2024-12-09T20:43:36Z", "2024-12-09T20:44:01Z"),
	criticalTakeoff           : new YouTubeVideo(timeline, "Vd4qp0Ua6ys", "Critical Think", "About to take off from Brisbane on the way to The Final Experiment", 15.008, 30, cams.criticalPhone, "2024-12-09T20:59:44Z", "2024-12-09T20:59:50Z"),
	criticalWeightSydney      : new YouTubeVideo(timeline, "Mu0QukhCnJo", "Critical Think", "Weight Measurement at Sydney", 280.021, 30, cams.criticalPhone, "2024-12-10T00:08:41Z", "2024-12-10T00:13:14Z"),
	criticalSantiago1         : new YouTubeVideo(timeline, "KhktwXaRhH4", "Critical Think", "Critical Think in Santiago", 335.041, 30, cams.criticalPhone, "2024-12-10T16:49:51Z", "2024-12-10T16:55:19Z"),
	criticalLivePuntaArenas   : new YouTubeVideo(timeline, "wu1NDzrmtR8", "Critical Think", "Critical Think is live in Punta Arenas", 665.041, 30, cams.criticalPhone, "2024-12-11T17:48:12Z", "2024-12-11T17:59:08Z"),
	criticalMikeTake2         : new YouTubeVideo(timeline, "xX8qzdtZIP0", "Critical Think", "Converstation with a flattie about The Final Experiment - Take 2", 3312.701, 30, cams.criticalLaptop, "2024-12-12T20:37:07Z", "2024-12-12T21:32:16Z"),
	criticalPuntaArenasUpdate : new YouTubeVideo(timeline, "SU6Ug298SFs", "Critical Think", "Punta Arenas Update", 1586.481, 30, cams.criticalPhone, "2024-12-13T10:46:36Z", "2024-12-13T11:15:09Z"),
	criticalOffToUG           : new YouTubeVideo(timeline, "E-BEXVkK7vo", "Critical Think", "Off to Union Glacier Today!", 154.781, 30, cams.criticalPhone, "2024-12-14T10:44:31Z", "2024-12-14T10:46:57Z"),
	criticalPuntaArenas       : new YouTubeVideo(timeline, "y3cDTLYNyPo", "Critical Think", "At the Airport Punta Arenas", 754.581, 30, cams.criticalPhone, "2024-12-14T12:40:34Z", "2024-12-14T12:52:38Z"),
	criticalLiveAtUG          : new YouTubeVideo(timeline, "jjDJlAfTgns", "Critical Think", "Critical Think is live at Union Glacier", 990.161, 30, cams.criticalPhone, "2024-12-14T21:26:56Z", "2024-12-14T21:46:19Z"),
	criticalMike              : new YouTubeVideo(timeline, "6-Ij1lr5OKs", "Critical Think", "Conversations with a flattie about the Sun.", 2745.221, 30, cams.criticalPhone, "2024-12-15T04:03:41Z", "2024-12-15T04:49:20Z"),
	criticalWolf              : new YouTubeVideo(timeline, "JQknVsqbDfg", "Critical Think", "Critical Think in Antarctica live with the Wolf Pack", 3804.421, 30, cams.criticalLaptop, "2024-12-16T10:01:04Z", "2024-12-16T11:04:22Z"),
	criticalWeight            : new YouTubeVideo(timeline, "rYY_KtSvG-4", "Critical Think", "Critical Think takes weight measurements at Union Glacier", 364.681, 30, cams.criticalPhone, "2024-12-16T18:05:02Z", "2024-12-16T18:10:59Z"),
	criticalReturnUG          : new YouTubeVideo(timeline, "fm4u3XqobtI", "Critical Think", "Return From Union Glacier", 3390.041, 30, cams.criticalLaptop, "2024-12-20T18:30:36Z", "2024-12-20T19:27:17Z"),
	criticalStreets           : new YouTubeVideo(timeline, "owAuIExovck", "Critical Think", "The Streets of Punta Arenas", 2575.741, 30, cams.criticalPhone, "2024-12-21T18:34:46Z", "2024-12-21T19:17:38Z"),
	criticalSantiago2         : new YouTubeVideo(timeline, "lr2faMG-SMY", "Critical Think", "Live at Santiago", 1719.533, 30, cams.criticalPhone, "2024-12-22T15:04:21Z", "2024-12-22T15:33:48Z"),
	criticalSydney            : new YouTubeVideo(timeline, "tGjzg1M7a1w", "Critical Think", "Live at Sydney", 491.241, 30, cams.criticalPhone, "2024-12-23T05:57:48Z", "2024-12-23T06:05:42Z"),
	criticalArrived           : new YouTubeVideo(timeline, "BeMPnsfCXmA", "Critical Think", "Arrived Sydney", 425.101, 30, cams.criticalPhone, "2024-12-23T06:29:56Z", "2024-12-23T06:37:07Z"),

	// Dave McKeegan / videos
	daveToUGTl                : new YouTubeVideo(timeline, "sl61HnhDDeA", "Dave McKeegan", "Insta360 timelapse of flight from Punta Arenas to Union Glacier", 249.981, NTSC30, cams.dave360, "2024-12-18T19:59:57Z")
		.setTimelapseRate(60.726643598615916955017301038062),
	daveTl                    : new YouTubeVideo(timeline, "in0B1OQG3-M", "Dave McKeegan", "Timelapse of the 24 hour Antarctic sun", 48.241, NTSC30, cams.dave360, "2024-12-16T18:09:28Z")
		.setTimelapseRate(undefined),
 	daveTl360                 : new YouTubeVideo(timeline, "jliLRasB48U", "Dave McKeegan", "360° Timelapse of capturing the 24hr Antarctic sun", 1540.101, NTSC30, cams.dave360, "2024-12-23T15:00:54Z")
		.setTimelapseRate(undefined),
	daveSolarPhotography      : new YouTubeVideo(timeline, "eYm6q8JY7Hk", "Dave McKeegan", "Solar photography destroys Flat Earth?", 1154.817, 25, peeps.dave, "2025-01-02T15:00:46Z")
		.setTimelapseRate(undefined).setClipsAreSequential(false),
	daveVapegate              : new YouTubeVideo(timeline, "4MsLg8Pjf-k", "Dave McKeegan", "Does #Vapegate and 'No breath' destroy 'The Final Experiment'?", 897.581, 25, peeps.dave, "2025-01-07T15:00:04Z")
		.setTimelapseRate(undefined).setClipsAreSequential(false),
	daveExcuses               : new YouTubeVideo(timeline, "AfQcTpXCLv8", "Dave McKeegan", "Flat Earthers excuses are getting desperate now", 1904.461, 25, peeps.dave, "2025-01-14T16:02:49Z")
		.setTimelapseRate(undefined).setClipsAreSequential(false),
	daveSunspots              : new YouTubeVideo(timeline, "RjQCb2TUMIU", "Dave McKeegan", "Antarctic sunspot video Update / Corrections", 1138.061, 25, peeps.dave, "2025-01-21T15:00:39Z")
		.setTimelapseRate(undefined).setClipsAreSequential(false),
	// Dave McKeegan / streams
	daveLive                  : new YouTubeVideo(timeline, "iOYpeysawuw", "Dave McKeegan", "The 24 hour sun has been captured in Antarctica!", 9834.461, 30, cams.daveLaptop, "2024-12-16T00:01:40Z", "2024-12-16T02:45:31Z"),

	// Jeran Campanella / videos
	jeranFlight               : new YouTubeVideo(timeline, "zMGeIDli4MA", "jeranism", "jeranism Antarctica GoPro Chest Cam Footage Full HD Flight & Landing - Union Glacier Camp - 12/2024", 18930.021, 30, cams.jeranAction, "2025-01-05T21:40:06Z"),
	// Jeran Campanella / streams
	jeranPuntaArenas1         : new YouTubeVideo(timeline, "EebhVG-5uFc", "jeranism", "LIVE from Punta Arenas. Checking in Looking South", 2299.901, 30, cams.jeranPhone, "2024-12-12T02:56:54Z", "2024-12-12T03:35:05Z"),
	jeranPuntaArenas2         : new YouTubeVideo(timeline, "AHRblqgWkwg", "jeranism", "LIVE from Punta Arenas Again 12-12-24 Lisbeth, Austin and Jeran", 2295.041, 30, cams.jeranPhone, "2024-12-13T02:29:49Z", "2024-12-13T03:07:50Z"),
	jeranPuntaArenas3         : new YouTubeVideo(timeline, "xl0DkVLFqkE", "jeranism", "LIVE from Punta Arenas Again Sunset Behind Clouds! Lisbeth, Austin, Jeran, Mark & You!", 4930.021, 30, cams.jeranPhone, "2024-12-14T01:00:14Z", "2024-12-14T02:22:11Z"),
	jeranLiveUG1              : new YouTubeVideo(timeline, "lOW_FTWMVV0", "jeranism", "We are LIVE from ANTARCTICA. Like WTF. Share this! Insanity", 1638.901, 30, cams.jeranPhone, "2024-12-14T19:30:10Z", "2024-12-14T20:01:41Z"),
	jeranLiveUG2              : new YouTubeVideo(timeline, "VPNmpiwl5Vs", "jeranism", "Antarctica! Where The Sun Doesn’t Set! LIVE", 1613.181, 30, cams.jeranPhone, "2024-12-16T02:03:17Z", "2024-12-16T02:30:05Z"),
	jeranLiveSunspots         : new YouTubeVideo(timeline, "nteDLN8kX2k", "jeranism", "SUNSPOT Observations from 80 Degrees South", 930.861, 30, cams.jeranPhone, "2024-12-16T16:39:51Z", "2024-12-16T16:56:05Z"),
	jeranLiveLast             : new YouTubeVideo(timeline, "NjTegLsl6lQ", "jeranism", "My Last Live From The Ice. Goodbye Antarctica! You Will Not Be Missed!", 1573.861, 30, cams.jeranPhone, "2024-12-17T15:08:21Z", "2024-12-17T15:40:17Z"),

	// Jonathan Mariande / shorts
	jonathanShort             : new YouTubeVideo(timeline, "VxVYpnqhH1A", "Jonathan Mariande", "In Antarctica filming a documentary for #TheFinalExperiment to document a 24-hour Sun.", 29.901, 30, cams.jonathanPhone, "2024-12-20T03:24:27Z"),
	// Jonathan Mariande / live
	jonathanLive              : new YouTubeVideo(timeline, "3839ioLw6-o", "Jonathan Mariande", "Flat Earther and Film Maker on #TheFinalExperiment - Live From Antarctica!", 809.241, 30, cams.jonathanPhone, "2024-12-16T02:37:51Z", "2024-12-16T02:51:12Z"),
	// Jonathan Mariande / TikTok
	jonathanWelcome           : new TikTokVideo(timeline, "jonathanmariande", "7449561812577717550", "Welcome To Antarctica for The Final Experiment. Does a 24-hour Antarctic sun prove the earth is round?", 36.314, 30, cams.jonathanPhone, "2024-12-18"),
	//jonathanDistanceQ         : new TikTokVideo(timeline, "jonathanmariande", "7449797462673427742", "In Antarctica filming a documentary for #TheFinalExperiment to document a 24-hour sun with FlatEarthers and Round Earthers.", 29.882, 30, cams.jonathanPhone, "2024-12-18"), // This one is available on Jonathan's YouTube channel.
	jonathanDistanceA         : new TikTokVideo(timeline, "jonathanmariande", "7450150446334807326", "Answer to the question proposed “how far is the mountian”. Here in Antarctica filming #thefinalexperiment and taking you around the ice continent.", 30.138, 30, cams.jonathanPhone, "2024-12-19"),
	jonathanIRThermal         : new TikTokVideo(timeline, "jonathanmariande", "7451329297572187422", "In Antarctica for #thefinalexperiment at halfway camp where we filmed 24-hour sun using infared to look around. What do you notice?", 95.246, 30, cams.jonathanPhone, "2024-12-22"),
	jonathanSnowblindness     : new TikTokVideo(timeline, "jonathanmariande", "7452529986659011870", "I’m in #Antarctica with #TheFinalExperiment asking questions and filming for a documentary and answering your q’s. Ask me anything!", 38.845, 30, cams.jonathanPhone, "2024-12-26"),
	jonathanToilet            : new TikTokVideo(timeline, "jonathanmariande", "7453350581571161374", "In Antarctica for #ThefinalExperiment at Union Glacier Camp there is a policy to leave no trace behind. So I present to you, bathrooms. How cold does it need to be for you to stay in your tent and pee in a bottle?", 54.611, 30, cams.jonathanPhone, "2024-12-28"),
	jonathanSnowcat           : new TikTokVideo(timeline, "jonathanmariande", "7454440969962884383", "In Antarctica for #TheFinalExperiment and while traveling between the main camp and what we called #halfWayCamp we used this tread driven Snowcat!", 29.255, 30, cams.jonathanPhone, "2024-12-31"),
	jonathanIce               : new TikTokVideo(timeline, "jonathanmariande", "7454441420057873694", "Is it just Antarctica or does snow/ice always have a sparkle of color when the light reflects? Have a look at this and tell me your thoughts. I live in California so I don’t spend lots of time in snow and ice climates! #thefinalexperiment", 17.715, 30, cams.jonathanPhone, "2024-12-31"),
	jonathanCrunch            : new TikTokVideo(timeline, "jonathanmariande", "7454488371608505642", "Back from Antarctica, and the debate is ON! 🧊🌍 People are claiming our #TheFinalExperiment videos are FAKE—saying there’s no visible breath and the snow doesn’t crunch underfoot. 👀❄️", 40.935, 30, cams.jonathanPhone, "2024-12-31"),
	jonathanSilent            : new TikTokVideo(timeline, "jonathanmariande", "7455605086023077150", "What am I saying? I’m saying enjoy this song and I’ll be right back.", 20.548, 30, cams.jonathanPhone, "2024-01-03"),

	// Mark Herman / videos
	markBehindScenes          : new YouTubeVideo(timeline, "CQUdgDx2Y6k", "Mark Herman", "Behind the scenes of @The-Final-Experiment \u200b\u2060and \u200b\u2060@MCToon live from Antarctica", 773.341, 30, cams.markPhone, "2024-12-15T19:35:49Z"),
	mark360Disembark          : new YouTubeVideo(timeline, "m5Bms8-F_Ag", "Mark Herman", "[4K | 360\u00b0] Stepping off the plane in Antarctica", 392.841, NTSC30, cams.mark360, "2025-01-08T19:05:51Z"),
	mark360DisembarkPhone     : new YouTubeVideo(timeline, "NYLTiYOgl3w", "Mark Herman", "Video of 757 exterior after landing in Antarctica", 17.786, 30, cams.markPhone, "2025-01-08T19:19:21Z"),
	mark360CampTour           : new YouTubeVideo(timeline, "OuoYoeKYIEI", "Mark Herman", "[4K | 360\u00b0] Arrival and Tour of Union Glacier Camp, Antarctica", 907.661, NTSC30, cams.mark360, "2025-01-09T17:25:00Z"),
	markQA2                   : new YouTubeVideo(timeline, "uIQAIqj3XGc", "Mark Herman", "Answering More of Your Questions! | The Final Experiment Explained", 558.341, NTSC24, cams.mark360, "2025-01-19T23:16:04Z"),

	// Micheal Toon (as McFlatty) / videos
	flattyPantyArena          : new YouTubeVideo(timeline, "OHzz96tO0c0", "McFlatty", "maid it too pantyarena ,next a ship to alask artica", 119.041, 24, cams.mctoonPhone, "2024-12-14T06:36:59Z"),
	flatty24Suns              : new YouTubeVideo(timeline, "IbGezIhqhNo", "McFlatty", "alaskarctica experimentalizashuns won", 123.956, NTSC30, cams.mctoonPhone, "2024-12-17T16:45:33Z"),
	flattyHome                : new YouTubeVideo(timeline, "62wCG4DyFro", "McFlatty", "tHere flafter mee ,a hhhomage tu meye bestee", 93.221, NTSC30, cams.mctoonPhone, "2024-12-19T01:59:30Z"),
	flattyFiguredItOut        : new YouTubeVideo(timeline, "m7tH56QE0R8", "McFlatty", "I tHink i fingered it owt", 15.379, 30, cams.mctoonPhone, "2024-12-19T20:00:20Z"),
	flattyIRThermometer       : new YouTubeVideo(timeline, "w_aaCW0zWIA", "McFlatty", "mikee smith meshure the tempature ov the sun", 58.901, NTSC30, cams.mctoonPhone, "2024-12-21T03:05:25Z"),
	flattyEscape              : new YouTubeVideo(timeline, "RT1rQZ9QT3Q", "McFlatty", "time tu exkape with all teh experimentalization data", 71.841, NTSC30, cams.mctoonPhone, "2024-12-22T02:37:16Z"),

	// Micheal Toon (as MCToon Live) / streams
	mctoonPuntaArenasLive1    : new YouTubeVideo(timeline, "Nw0YTOffQnI", "MCToon Live", "Live from Punta Arenas", 2336.521, 30, cams.mctoonPhone, "2024-12-10T20:10:44Z", "2024-12-10T20:49:37Z"),
	mctoonPuntaArenasLive2    : new YouTubeVideo(timeline, "TRwBnEEMqs0", "MCToon Live", "Antarctica: So Much Action to Cover", 4309.361, 30, cams.mctoonPhone, "2024-12-13T03:35:53Z", "2024-12-13T04:47:36Z"),
	mctoonPuntaArenasLive3    : new YouTubeVideo(timeline, "O_CJzkN-ENE", "MCToon Live", "Tomorrow we fly to Antarctica", 11044.281, 30, cams.mctoonLaptop, "2024-12-14T02:00:16Z", "2024-12-14T05:04:16Z"),
	mctoonLive100Percent      : new YouTubeVideo(timeline, "paQ7nklL8X4", "MCToon Live", "Live 100% Flat Earth Destruction Guaranteed", 10265.481, 30, cams.mctoonLaptop, "2024-12-15T05:00:12Z", "2024-12-15T07:51:13Z"),
	mctoonLiveBack            : new YouTubeVideo(timeline, "yw7yfsH5XuM", "MCToon Live", "Back from the Ice", 20482.961, 30, cams.mctoonLaptop, "2024-12-19T03:06:22Z", "2024-12-19T11:58:41Z"),

	// Micheal Toon (as Conspiracy Toonz) / videos
	mctoon2ToGo               : new YouTubeVideo(timeline, "gIzwZyRQI-s", "Conspiracy Toonz", "We are in South America: Flerfs on Ice 2 to Go", 729.921, 30, peeps.mctoon, "2024-12-12T09:00:46Z"),
	mctoonMarathon            : new YouTubeVideo(timeline, "sWOvth8Sg2o", "Conspiracy Toonz", "Marathons in Antarctica and the North Pole", 809.821, 30, peeps.mctoon, "2024-12-12T21:00:41Z"),
	mctoon1ToGo               : new YouTubeVideo(timeline, "LATFvsNdz3M", "Conspiracy Toonz", "Antarctica Tomorrow", 753.941, 30, peeps.mctoon, "2024-12-13T13:45:02Z")
		.setCoordinates(-53.1626, -70.9028),
	mctoon0ToGo               : new YouTubeVideo(timeline, "zpCv8t7mIZg", "Conspiracy Toonz", "Flerfs on Ice: 0 to go", 529.601, 30, peeps.mctoon, "2024-12-14T11:01:11Z"),
	mctoonFlightTl            : new YouTubeVideo(timeline, "VEDcntQQuuA", "Conspiracy Toonz", "Timelapse of the Flight from Punta Arenas to Union Glacier Right Side View", 600.021, 30, peeps.mctoon, "2024-12-18T19:40:44Z")
		.setTimelapseRate(30),
	mctoonBlueIceRunway       : new YouTubeVideo(timeline, "xpseYOD8clw", "Conspiracy Toonz", "Antarctica Blue Ice Runway", 508.761, 30, peeps.mctoon, "2024-12-23T12:01:15Z"),
	mctoon360Part1            : new YouTubeVideo(timeline, "qbQJx9T5_WU", "Conspiracy Toonz", "Antarctic 360° Real Time 24 Hour Sun Part A", 42834.381, NTSC30, cams.mctoon360, "2025-01-08T12:01:12Z"),
	mctoon360Part2            : new YouTubeVideo(timeline, "95P8urNDzDQ", "Conspiracy Toonz", "Antarctic 360° Real Time 24 Hour Sun Part B", 43207.161, NTSC30, cams.mctoon360, "2025-01-09T00:00:06Z"),
	mctoon360Part3            : new YouTubeVideo(timeline, "Mp4E2PQLUgg", "Conspiracy Toonz", "Antarctic 360° Real Time 24 Hour Sun Part C",  1619.821, NTSC30, cams.mctoon360, "2025-01-09T12:00:35Z"),
	mctoonSunDialShadow       : new YouTubeVideo(timeline, "n9_cU3EDWG4", "Conspiracy Toonz", "Antarctic 24 hour Sun Dial: 79°S, not 74°S", 134.561, NTSC60, cams.mctoon360, "2024-12-27T01:20:00Z")
		.setTimelapseRate(undefined),
	mctoonSunDialSun          : new YouTubeVideo(timeline, "xR3wPw2MoG0", "Conspiracy Toonz", "What does the Sun do in Antarctica?", 272.361, 60, cams.mctoon360, "2024-12-31T11:06:26Z")
		.setTimelapseRate(undefined),
	mctoonOakley              : new YouTubeVideo(timeline, "6bwNkVviosM", "Conspiracy Toonz", "I Called a Flat Earther from Antarctica", 481.281, 25, cams.daveSonyA7iv, "2024-12-16T13:30:06Z"),
	mctoonFinalDay            : new YouTubeVideo(timeline, "337B7iNYbjA", "Conspiracy Toonz", "The Final Experiment: The Final Day", 980.881, 30, cams.mctoonAction, "2024-12-20T02:30:02Z")
		.setClipsAreSequential(false),
	mctoonClockApp            : new YouTubeVideo(timeline, "M2zsplLqbgc", "Conspiracy Toonz", "Antarctica Tested: FE Clock App", 681.101, 30, peeps.mctoon, "2024-12-21T14:30:16Z"), // TODO: Recorded on the 20th in Santiago airport, was flying at 21st 23:15
	// Micheal Toon (as Conspiracy Toonz) / streams
	mctoonShowingExperiments  : new YouTubeVideo(timeline, "idrvFgrMK_A", "Conspiracy Toonz", "Showing experiments in Antarctica", 1739.001, 30, peeps.mctoon, "2024-12-15T17:50:16Z", "2024-12-15T18:19:11Z"),
	
	// Michael Toon chest cam footage
	// The anchor times here serve only to calibrate the camera's internal frame counter.
	// As such, we omit anything time tells that aren't known to be highly accurate.
	mctoonDji09115240         : new MCToonDjiUpload(timeline, "DJI_20241209115240_0001_D", "11:53:19;26",   95.402),
	mctoonDji09120043         : new MCToonDjiUpload(timeline, "DJI_20241209120043_0002_D", "12:01:22;23",   38.784)
		.addAnchorTime("09T11:59-06", "00:00:04.950", ts.digital)
		.addAnchorTime("09T11:59-06", "00:00:17.894", ts.digital),
	mctoonDji09162918         : new MCToonDjiUpload(timeline, "DJI_20241209162918_0003_D", "16:29:57;13",  740.639),
	mctoonDji09164442         : new MCToonDjiUpload(timeline, "DJI_20241209164442_0004_D", "16:45:21;11",  967.333)
		.addAnchorTime("09T17:53-05", "00:10:34.350", ts.digital)
		.addAnchorTime("09T17:53-05", "00:10:34.577", ts.digital),
	mctoonDji09170308         : new MCToonDjiUpload(timeline, "DJI_20241209170308_0005_D", "17:03:47;12",  334.080),
	mctoonDji09170940         : new MCToonDjiUpload(timeline, "DJI_20241209170940_0006_D", "17:10:19;12",    2.944),
	mctoonDji09173653         : new MCToonDjiUpload(timeline, "DJI_20241209173653_0007_D", "17:37:31;27",   18.718),
	mctoonDji09173741         : new MCToonDjiUpload(timeline, "DJI_20241209173741_0008_D", "17:38:19;29", 1572.370)
		.addAnchorTime("09T18:37-05", "00:00:58.701", ts.digital)
		.addAnchorTime("09T18:37-05", "00:01:29.823", ts.digital)
		.addAnchorTime("09T18:43-05", "00:06:37.326", ts.digitalFlip),
	mctoonDji09193444         : new MCToonDjiUpload(timeline, "DJI_20241209193444_0001_D", "19:35:23;04",   37.824),
	
	mctoonDji10033040         : new MCToonDjiUpload(timeline, "DJI_20241210033040_0003_D", "03:31:18;26",  111.914, "MCToon-TFEAntarctica-20241210033040"),
	mctoonDji10033519         : new MCToonDjiUpload(timeline, "DJI_20241210033519_0004_D", "03:35:58;03",  332.265, "MCToon-TFEAntarctica-20241210033519"),
	mctoonDji10034910         : new MCToonDjiUpload(timeline, "DJI_20241210034910_0005_D", "03:49:49;00",   66.800, "MCToon-TFEAntarctica-20241210034910"),
	mctoonDji10035143         : new MCToonDjiUpload(timeline, "DJI_20241210035143_0006_D", "03:52:22;15",  331.764, "MCToon-TFEAntarctica-20241210035143")
	.addAnchorTime("10T04:55-05", "00:05:05.575", ts.digital),
	mctoonDji10042028         : new MCToonDjiUpload(timeline, "DJI_20241210042028_0007_D", "04:21:07;10",  447.280, "MCToon-TFEAntarctica-20241210042028"),
	mctoonDji10060008         : new MCToonDjiUpload(timeline, "DJI_20241210060008_0008_D", "06:00:47;22",  528.394, "MCToon-TFEAntarctica-20241210060008"),
	mctoonDji10061820         : new MCToonDjiUpload(timeline, "DJI_20241210061820_0009_D", "06:18:59;19",  319.168, "MCToon-TFEAntarctica-20241210061820"),
	mctoonDji10070633         : new MCToonDjiUpload(timeline, "DJI_20241210070633_0010_D", "07:07:12;02",  364.672, "MCToon-TFEAntarctica-20241210070633"),
	mctoonDji10081808         : new MCToonDjiUpload(timeline, "DJI_20241210081808_0011_D", "08:18:47;05",   17.173, "MCToon-TFEAntarctica-20241210081808"),
	mctoonDji10082413         : new MCToonDjiUpload(timeline, "DJI_20241210082413_0012_D", "08:24:51;22",   87.987, "MCToon-TFEAntarctica-20241210082413"),
	mctoonDji10095418         : new MCToonDjiUpload(timeline, "DJI_20241210095418_0013_D", "09:54:57;29",  808.941, "MCToon-TFEAntarctica-20241210095418"),
	mctoonDji10102307         : new MCToonDjiUpload(timeline, "DJI_20241210102307_0015_D", "10:23:46;03",  590.869, "MCToon-TFEAntarctica-20241210102307"),
	mctoonDji10140047         : new MCToonDjiUpload(timeline, "DJI_20241210140047_0016_D", "14:01:26;12", 1504.135, "MCToon-TFEAntarctica-20241210140047"),
	mctoonDji10142552         : new MCToonDjiUpload(timeline, "DJI_20241210142552_0017_D", "14:26:30;14",  638.170, "MCToon-TFEAntarctica-20241210142552"),
	mctoonDji10152903         : new MCToonDjiUpload(timeline, "DJI_20241210152903_0018_D", "15:29:42;02",    3.370)
	.addAnchorTime("10T18:27-03", "00:00:00.000", ts.digital).addAnchorTime("10T18:27-03", "00:00:03.342", ts.digital),
	mctoonDji10163402         : new MCToonDjiUpload(timeline, "DJI_20241210163402_0019_D", "16:34:41;19", 1412.911, "MCToon-TFEAntarctica-20241210163402"),
	mctoonDji10181357         : new MCToonDjiUpload(timeline, "DJI_20241210181357_0020_D", "18:14:36;15",  507.273, "MCToon-TFEAntarctica-20241210181357"),
	mctoonDji10191703         : new MCToonDjiUpload(timeline, "DJI_20241210191703_0022_D", "19:17:42;18",  312.320, "MCToon-TFEAntarctica-20241210191703"),
	mctoonDji10193011         : new MCToonDjiUpload(timeline, "DJI_20241210193011_0023_D", "19:30:50;09",  807.640, "MCToon-TFEAntarctica-20241210193011"),
	mctoonDji10194400         : new MCToonDjiUpload(timeline, "DJI_20241210194400_0024_D", "19:44:39;11",   45.866, "MCToon-TFEAntarctica-20241210194400"),
	mctoonDji10194508         : new MCToonDjiUpload(timeline, "DJI_20241210194508_0025_D", "19:45:47;09",    1.634),

	mctoonDji11064027         : new MCToonDjiUpload(timeline, "DJI_20241211064027_0001_D", "06:41:06;28", 1183.115, "MCToon-TFEAntarctica-20241211064027"),
	mctoonDji11071936         : new MCToonDjiUpload(timeline, "DJI_20241211071936_0002_D", "07:20:15;10", 1867.699, "MCToon-TFEAntarctica-20241211071936"),
	mctoonDji11075044         : new MCToonDjiUpload(timeline, "DJI_20241211075044_0003_D", "07:51:22;28", 1922.921, "MCToon-TFEAntarctica-20241211075044"), // TODO: Marathon runner interview is here
	mctoonDji11082247         : new MCToonDjiUpload(timeline, "DJI_20241211082247_0004_D", "08:23:25;22", 1479.177, "MCToon-TFEAntarctica-20241211082247")  // TODO: Austin, Jeran, Lisbeth arrive this night
	.addAnchorTime("11T11:35-03", "00:13:55.143", ts.digital).addAnchorTime("11T11:35-03", "00:14:02.922", ts.digital),
	mctoonDji11090219         : new MCToonDjiUpload(timeline, "DJI_20241211090219_0007_D", "09:02:58;05",  953.852, "MCToon-TFEAntarctica-20241211090219")  // TODO: Talk about Jeran's flight
	.addAnchorTime("11T12:05-03", "00:04:16.758", ts.digital).addAnchorTime("11T12:05-03", "00:04:18.077", ts.digital),
	mctoonDji11094701         : new MCToonDjiUpload(timeline, "DJI_20241211094701_0010_D", "09:47:39;24",   57.365, "MCToon-TFEAntarctica-20241211094701"),
	mctoonDji11094840         : new MCToonDjiUpload(timeline, "DJI_20241211094840_0011_D", "09:49:19;19", 1505.470, "MCToon-TFEAntarctica-20241211094840")
	.addAnchorTime("11T12:50-03", "00:03:38.384", ts.digital).addAnchorTime("11T12:50-03", "00:03:38.751", ts.digital),
	mctoonDji11101347         : new MCToonDjiUpload(timeline, "DJI_20241211101347_0012_D", "10:14:24;29",   21.621, "MCToon-TFEAntarctica-20241211101347"),
	mctoonDji11113557         : new MCToonDjiUpload(timeline, "DJI_20241211113557_0013_D", "11:36:36;10", 1521.753, "MCToon-TFEAntarctica-20241211113557"),
	mctoonDji11120120         : new MCToonDjiUpload(timeline, "DJI_20241211120120_0014_D", "12:01:57;28",   39.472, "MCToon-TFEAntarctica-20241211120120"),
	mctoonDji11121419         : new MCToonDjiUpload(timeline, "DJI_20241211121419_0016_D", "12:14:58;03", 1029.595, "MCToon-TFEAntarctica-20241211121419"),
	mctoonDji11125131         : new MCToonDjiUpload(timeline, "DJI_20241211125131_0017_D", "12:52:10;02",  969.835, "MCToon-TFEAntarctica-20241211125131"),
	mctoonDji11153643         : new MCToonDjiUpload(timeline, "DJI_20241211153643_0018_D", "15:37:22;28", 1504.236, "MCToon-TFEAntarctica-20241211153643")
	.addAnchorTime("11T18:45-03", "00:10:35.680", ts.digital).addAnchorTime("11T18:45-03", "00:10:36.997", ts.digital),
	mctoonDji11160149         : new MCToonDjiUpload(timeline, "DJI_20241211160149_0019_D", "16:02:27;01", 1123.722, "MCToon-TFEAntarctica-20241211160149")
	.addAnchorTime("11T19:05-03", "00:05:31.731", ts.digital),
	mctoonDji11171516         : new MCToonDjiUpload(timeline, "DJI_20241211171516_0020_D", "17:15:55;22", 1578.357, "MCToon-TFEAntarctica-20241211171516") // TODO: Austin, Jeran, Lisbeth arrived
	.addAnchorTime("11T20:33-03", "00:19:09.015", ts.digitalFlip)
	.addAnchorTime("11T20:34-03", "00:20:09.042", ts.digitalFlip),
	mctoonDji11174136         : new MCToonDjiUpload(timeline, "DJI_20241211174136_0021_D", "17:42:14;03", 1575.640, "MCToon-TFEAntarctica-20241211174136")
	.addAnchorTime("11T20:43-03", "00:03:19.328", ts.digital).addAnchorTime("11T20:43-03", "00:03:20.187", ts.digital)
	.addAnchorTime("11T20:46-03", "00:06:44.392", ts.digital).addAnchorTime("11T20:46-03", "00:06:45.342", ts.digital)
	.addAnchorTime("11T20:47-03", "00:06:59.381", ts.digital),
	mctoonDji11180751         : new MCToonDjiUpload(timeline, "DJI_20241211180751_0022_D", "18:08:29;20", 1571.169, "MCToon-TFEAntarctica-20241211180751")
	.addAnchorTime("11T21:08-03", "00:02:01.747", ts.digital)
	.addAnchorTime("11T21:12-03", "00:05:58.642", ts.digital).addAnchorTime("11T21:12-03", "00:06:00.026", ts.digital),
	mctoonDji11183403         : new MCToonDjiUpload(timeline, "DJI_20241211183403_0023_D", "18:34:40;21", 1576.575, "MCToon-TFEAntarctica-20241211183403")
	.addAnchorTime("11T21:54-03", "00:22:10.848", ts.digital),
	mctoonDji11190019         : new MCToonDjiUpload(timeline, "DJI_20241211190019_0024_D", "19:00:57;04", 1589.254, "MCToon-TFEAntarctica-20241211190019"),
	mctoonDji11192648         : new MCToonDjiUpload(timeline, "DJI_20241211192648_0025_D", "19:27:26;11", 1565.130, "MCToon-TFEAntarctica-20241211192648"),
	mctoonDji11195257         : new MCToonDjiUpload(timeline, "DJI_20241211195257_0026_D", "19:53:36;10", 1249.047, "MCToon-TFEAntarctica-20241211195257")
	.addAnchorTime("11T22:57-03", "00:05:28.261", ts.digitalFlip),
	
	mctoonDji14065900         : new MCToonDjiUpload(timeline, "DJI_20241214065900_0007_D", "06:59:39;09", 1687.986, "MCToon-TFEAntarctica-20241214065900")
	.addAnchorTime("14T10:01-03", "00:04:24.097", ts.digital).addAnchorTime("14T10:01-03", "00:04:25.952", ts.digital),
	mctoonDji14072709         : new MCToonDjiUpload(timeline, "DJI_20241214072709_0008_D", "07:27:47;08", 2376.240, "MCToon-TFEAntarctica-20241214072709"),
	mctoonDji14080646         : new MCToonDjiUpload(timeline, "DJI_20241214080646_0009_D", "08:07:23;16", 2930.961, "MCToon-TFEAntarctica-20241214080646"),
	mctoonDji14085536         : new MCToonDjiUpload(timeline, "DJI_20241214085536_0010_D", "08:56:14;15", 3255.852, "MCToon-TFEAntarctica-20241214085536"),
	mctoonDji14094952         : new MCToonDjiUpload(timeline, "DJI_20241214094952_0011_D", "09:50:30;09", 2950.647, "MCToon-TFEAntarctica-20241214094952"),
	mctoonDji14103903         : new MCToonDjiUpload(timeline, "DJI_20241214103903_0012_D", "10:39:41;00", 3728.825, "MCToon-TFEAntarctica-20241214103903"),

	// Wheres Wally / videos
	wallyJeranometer          : new YouTubeVideo(timeline, "u8CZEPYQLfE", "WheresWally", "The FIRST Data From Wally's Jeronometer Experiment Is Released, And It's GLOBE", 448.281, 30, cams.wallyAction, "2024-12-19T15:43:14Z")
		.setTimelapseRate(1800.2025658338960162052667116813),
	wallyGreenscreen          : new YouTubeVideo(timeline, "CAUBiTBFUR4", "WheresWally", "The Final Experiment Drone Supercut Wrecks Drone Gate by Fkatzoid & Sovereign Soul Unchained Mind", 850.401, 30, cams.willDrone, "2025-01-02T15:12:54Z"),
	wallyDrone                : new YouTubeVideo(timeline, "x1yKGnMzVoE", "WheresWally", "The Final Experiment Mile High Drone with Ascent and Descent by Will Duffy Telemetry by WheresWally", 1305.131, NTSC60, cams.willDrone, "2025-01-14T00:03:36Z"),

	// Will Duffy / videos
	willPuntaArenas           : new YouTubeVideo(timeline, "ToWBZwc7vk8", "The Final Experiment", "The Globe Predicts 24-Hour Sun AND 24-Hour Moon in Antarctica!", 329.621, NTSC30, peeps.will, "2024-12-12T20:00:06Z"),
	willTenseSituation        : new YouTubeVideo(timeline, "omZA5uKg0XA", "The Final Experiment", "Tense Situation Before We Depart for Antarctica", 656.301, 30, peeps.will, "2024-12-13T20:00:09Z"),
	willLastUpdateBeforeUG    : new YouTubeVideo(timeline, "epa9kOZI2co", "The Final Experiment", "Last Update Before We Fly to Antarctica!", 1736.941, 30, peeps.will, "2024-12-14T15:00:06Z"),
	willObservationArmy       : new YouTubeVideo(timeline, "UXsrPSBZhto", "The Final Experiment", "Join the TFE Observation Army! We need YOU!", 159.301, 60, cams.willPhone, "2024-12-16T16:12:54Z")
		.setCoordinates(-79.7809094, -83.3155382),
	will360Part1              : new YouTubeVideo(timeline, "Gv4nUyTQcVw", "The Final Experiment", "World's First Non-Timelapse Video of the 24-Hour Sun in Antarctica! (Part 1)", 36000.121, NTSC30, cams.will360B, "2025-01-07T16:50:55Z"),
	will360Part2              : new YouTubeVideo(timeline, "0dC_06X8bto", "The Final Experiment", "World's First Non-Timelapse Video of the 24-Hour Sun in Antarctica! (Part 2)", 35970.261, NTSC30, cams.will360B, "2025-01-08T22:04:31Z"),
	will360Part3              : new YouTubeVideo(timeline, "vzGvqEObA6c", "The Final Experiment", "World's First Non-Timelapse Video of the 24-Hour Sun in Antarctica! (Part 3)", 21559.061, NTSC30, cams.will360B, "2025-01-15T17:59:45Z"),
	willStartrails            : new YouTubeVideo(timeline, "5Ih7NvUYg4g", "The Final Experiment", "THE FINAL EXPERIMENTS - South Celestial Pole", 1537.421, NTSC30, peeps.will, "2025-01-13T20:00:06Z")
		.setTimelapseRate(undefined),
	willSunriseSunsetPuntaArenas : new YouTubeVideo(timeline, "_2Wy2aTnTME", "The Final Experiment", "THE FINAL EXPERIMENTS - Sunrise & Sunset Direction", 1423.901, 25, peeps.will, "2025-01-20T20:00:06Z")
		.setClipsAreSequential(false)
		.setTimelapseRate(undefined),
	willSecond360             : new YouTubeVideo(timeline, "c_ZvL-F4prs", "The Final Experiment", "360-Degree Antarctica! Interactive 36-Hour Timelapse of the 24-Hour Sun (Click/drag to look around)", 2161.785, NTSC30, cams.will360B, "2025-01-07T16:50:55Z")
		.setTimelapseRate(60.7), // 60.68 .. 60.83
	// Will Duffy / streams
	willMidnightAntarctica    : new YouTubeVideo(timeline, "d_LNSbStu9c", "The Final Experiment", "It's Midnight in Antarctica!", 3095.721, 30, cams.willLaptop, "2024-12-15T03:00:13Z", "2024-12-15T03:51:43Z"),
	willNoGreenscreens        : new YouTubeVideo(timeline, "E1vXwAT6P5k", "The Final Experiment", "There Are No Green Screens in Antarctica (Here's Proof!)", 995.101, 30, cams.willLaptop, "2024-12-15T17:50:16Z", "2024-12-15T18:06:44Z"),
	willLiveAntarctica        : new YouTubeVideo(timeline, "KBIyN7ZWifE", "The Final Experiment", "The Final Experiment Live from Antarctica!", 2983.601, 30, cams.willLaptop, "2024-12-16T03:00:22Z", "2024-12-16T03:50:00Z"),
	willFinalDayLive          : new YouTubeVideo(timeline, "jJzREAclmxk", "The Final Experiment", "The Final Day - Live from Punta Arenas!", 5571.161, 30, peeps.will, "2024-12-19T20:00:24Z", "2024-12-19T21:33:09Z"),
};

/** List of clips created from the videos. */
export const clips = {
	// Austin Whitsitt / videos
	austin24hPart1             : vids.austin24hPart1.createClip(),
	austin24hPart2             : vids.austin24hPart2.createClip(),
	austin24hPart3             : vids.austin24hPart3.createClip(),
	austin24hTl                : vids.austin24hTl.createClip(),
	// Austin Whitsitt / streams
	austinLive                 : vids.austinLive
		.skipClip("00:03:30/08")
		.addAnchorTime("15T16:59-03", "00:13:37.0", ts.almost)
		.createClip("00:44:56/20"),

	// Critical Think / videos
	criticalFlight1Tl          : vids.criticalFlight1Tl.createClip(),
	criticalFlight2Tl          : vids.criticalFlight2Tl.createClip(),
	criticalFlight2Landing     : vids.criticalFlight2Landing.createClip(),
	criticalFlight3Tl          : vids.criticalFlight3Tl.createClip(),
	// Critical Think / streams
	criticalBrisbane           : vids.criticalBrisbane.createClip(),
	criticalTakeoff            : vids.criticalTakeoff.createClip(),
	criticalWeightSydney       : vids.criticalWeightSydney.createClip(),
	criticalSantiago1          : vids.criticalSantiago1.createClip(),
	criticalLivePuntaArenas    : vids.criticalLivePuntaArenas.createClip(),
	criticalMikeTake2          : vids.criticalMikeTake2
		.addAnchorTime("12T17:37-03", "00:00:46.0", ts.digitalRead)
		.addAnchorTime("12T17:37-03", "00:00:55.0", ts.digitalRead)
		.createClip(),
	criticalPuntaArenasUpdateA : vids.criticalPuntaArenasUpdate.createClip("00:19:49/09"),
	criticalPuntaArenasUpdateB : vids.criticalPuntaArenasUpdate.createClip(),
	criticalOffToUG            : vids.criticalOffToUG.createClip(),
	criticalPuntaArenas        : vids.criticalPuntaArenas
		.addAnchorTime("14T20:51+08", "00:11:14/26", ts.ytChat)
		.createClip(),
	criticalLiveAtUGA          : vids.criticalLiveAtUG
		.addAnchorTime("14T18:30-03", "00:00:51.0", ts.roundabout)
		.createClip("00:04:08/06"),
	criticalLiveAtUGB          : vids.criticalLiveAtUG
		.addAnchorTime("14T18:36-03", "00:08:03/06", ts.digitalRead)
		.createClip("00:11:05/03"),
	criticalLiveAtUGC          : vids.criticalLiveAtUG
		.addAnchorTime("14T18:43-03", "00:13:40/21", ts.digitalRead)
		.createClip(),
	criticalMike               : vids.criticalMike
		.addAnchorTime("15T14:25+10", "00:21:45/15", ts.digital)
		.addAnchorTime("15T01:35-03", "00:31:47/00", ts.digitalRead)
		.addAnchorTime("15T14:45+10", "00:41:26.5", ts.digitalRead)
		.createClip(),
	criticalWolf               : vids.criticalWolf.createClip(),
	criticalWeight             : vids.criticalWeight.createClip(),
	criticalReturnUG           : vids.criticalReturnUG.createClip(),
	criticalStreets            : vids.criticalStreets
		.addAnchorTime("22T04:35+10", "00:01:33/11", ts.ytChat) // Chat said "pm", but clearly meant "am".
		.addAnchorTime("21T15:57-03", "00:22:39.5", ts.digitalRead)
		.addAnchorTime("21T16:00-03", "00:25:29.7", ts.churchBells)
		.createClip(),
	criticalSantiago2A         : vids.criticalSantiago2.createClip("00:20:46/26"),
	criticalSantiago2B         : vids.criticalSantiago2.createClip("00:24:14/01"),
	criticalSantiago2C         : vids.criticalSantiago2.createClip(),
	criticalSydney             : vids.criticalSydney.createClip(),
	criticalArrivedA           : vids.criticalArrived.createClip("00:05:04/21"),
	criticalArrivedB           : vids.criticalArrived.createClip("00:05:15/19"),
	criticalArrivedC           : vids.criticalArrived.createClip("00:05:23/17"),
	criticalArrivedD           : vids.criticalArrived.createClip(),

	// Dave McKeegan / videos
	daveToUGTl                 : vids.daveToUGTl
		.addAnchorTime("14T10:31-03", "00:00:03/05", ts.digital)
		.addAnchorTime("14T10:33-03", "00:00:04/20", ts.digital)
		.addAnchorTime("14T10:33-03", "00:00:04/22", ts.digital)
		.createClip(),
	daveTl                     : vids.daveTl.createClip(),
	daveTl360                  : vids.daveTl360.createClip(),
	daveSolarPhotographyA      : vids.daveSolarPhotography
		.skipClip("00:00:05/11")
		.createClip("00:00:13/02").setTimelapseRate(1),
	daveSolarPhotographyB      : vids.daveSolarPhotography
		.skipClip("00:00:40/21") // There is a longer clip of the long distance shot in Dave's next video.
		.createClip("00:00:45/16").setTimelapseRate(1),
	daveSolarPhotographyC      : vids.daveSolarPhotography
		.skipClip("00:01:30/23") // There's a longer version of the clip at 0:52 in "Antarctic sunspot video Update / Corrections" at 7:25	
		.createClip("00:01:38/12").setTimelapseRate(1),
	daveSolarPhotographyD      : vids.daveSolarPhotography
		.skipClip("00:02:00/06") // There's a longer version of the clip at 1:31 in "Antarctic sunspot video Update / Corrections" at 1:53
		.createClip("00:02:05/17").setTimelapseRate(1), // TODO: what's the speedup?
	daveSolarPhotographyE      : vids.daveSolarPhotography
		.createClip("00:02:17/13").setTimelapseRate(1), // TODO: what's the speedup?
	daveSolarPhotographyF      : vids.daveSolarPhotography
		.skipClip("00:03:04/13")
		.createClip("00:03:11/07").setTimelapseRate(1), // TODO: what's the speedup?
	daveSolarPhotographyG      : vids.daveSolarPhotography
		.skipClip("00:03:13/03")
		.createClip("00:03:17/11").setTimelapseRate(1),
	daveSolarPhotographyH      : vids.daveSolarPhotography
		.createClip("00:03:22/16").setTimelapseRate(1),
	daveSolarPhotographyI      : vids.daveSolarPhotography
		.skipClip("00:03:31/19")
		.createClip("00:03:38/23").setTimelapseRate(1),
	daveSolarPhotographyJ      : vids.daveSolarPhotography
		.skipClip("00:04:19/00")
		.addAnchorTime("17T02:22-03", "00:04:19/09", ts.digital)
		.createClip("00:04:22/19").setTimelapseRate(1),
	daveSolarPhotographyK      : vids.daveSolarPhotography
		.skipClip("00:04:47/13")
		//.addAnchorTime("17T01:11-03", "00:04:50", ts.sun) // Time estimated from 24h footage. The 15th/16th were the only day TFE was in Antarctica and the 15th didn't have clouds.
		.addAnchorTime("17T02:30-03", "00:04:50", ts.sun) // TODO: Time estimated from 24h footage. The 15th/16th were the only day TFE was in Antarctica and the 15th didn't have clouds.
		.createClip("00:04:53/07").setTimelapseRate(1),
	daveSolarPhotographyL      : vids.daveSolarPhotography
		.skipClip("00:05:18/10")
		.createClip("00:05:39/19").setTimelapseRate(1), // TODO: what's the speedup?
	daveSolarPhotographyM      : vids.daveSolarPhotography
		.createClip("00:05:46/13").setTimelapseRate(1), // TODO: what's the speedup?
	daveSolarPhotographyN      : vids.daveSolarPhotography
		.createClip("00:05:52/01").setTimelapseRate(1),
	daveSolarPhotographyO      : vids.daveSolarPhotography
		.skipClip("00:06:07/00")
		.createClip("00:06:13/07").setTimelapseRate(1),
	daveSolarPhotographyP      : vids.daveSolarPhotography
		.skipClip("00:08:02/13")
		.createClip("00:08:07/17").setTimelapseRate(1),
	daveSolarPhotographyQ      : vids.daveSolarPhotography
		.skipClip("00:09:49/00") // Sun spot clip was redone in a later video.
		.createClip("00:09:53/03").setTimelapseRate(1),
	daveSolarPhotographyR      : vids.daveSolarPhotography
		.skipClip("00:11:06/05")
		.createClip("00:11:11/23").setTimelapseRate(1),
	daveSolarPhotographyS      : vids.daveSolarPhotography
		.skipClip("00:14:01/12")
		.createClip("00:14:06/19").setTimelapseRate(1), // TODO: what's the speedup?
	daveSolarPhotographyT      : vids.daveSolarPhotography
		.createClip("00:14:08/21").setTimelapseRate(1), // TODO: what's the speedup?
	daveSolarPhotographyU      : vids.daveSolarPhotography
		.skipClip("00:14:11/18")
		.createClip("00:14:19/08").setTimelapseRate(1), // TODO: what's the speedup?
	daveSolarPhotographyV      : vids.daveSolarPhotography
		.createClip("00:14:23/12").setTimelapseRate(1),
	daveVapegateA              : vids.daveVapegate
		.skipClip("00:00:11/07")
		.createClip("00:00:22/20").setTimelapseRate(1),
	daveVapegateB              : vids.daveVapegate
		.skipClip("00:01:31/00")
		.createClip("00:01:37/03").setTimelapseRate(1),
	daveVapegateC              : vids.daveVapegate
		.skipClip("00:05:33/05")
		.createClip("00:05:37/04").setTimelapseRate(1), // TODO: Shows time-lapse recording timer on insta360 X4. Create a sync point out of it.
	daveVapegateD              : vids.daveVapegate
		.skipClip("00:09:44/06")
		.createClip("00:09:49/18").setTimelapseRate(1),
	daveVapegateE              : vids.daveVapegate
		.createClip("00:09:59/18").setTimelapseRate(1),
	daveVapegateF              : vids.daveVapegate
		.skipClip("00:11:44/10")
		.createClip("00:11:50/05"),
	daveVapegateG              : vids.daveVapegate
		.createClip("00:12:03/12"),
	daveVapegateH              : vids.daveVapegate
		.createClip("00:12:07/01").setTimelapseRate(1),
	daveVapegateI              : vids.daveVapegate
		.createClip("00:12:12/14").setTimelapseRate(1),
	daveVapegateJ              : vids.daveVapegate
		.createClip("00:12:23/16").setTimelapseRate(1),
	daveExcusesA               : vids.daveExcuses
		.skipClip("00:03:25/02")
		.createClip("00:03:31/06").setTimelapseRate(1),
	daveExcusesB               : vids.daveExcuses
		.createClip("00:03:36/01").setTimelapseRate(1),
	daveExcusesC               : vids.daveExcuses
		.skipClip("00:04:34/12")
		.createClip("00:04:38/18").setTimelapseRate(1), // Dave's camera recording.
	daveExcusesD               : vids.daveExcuses
		.skipClip("00:07:18/06")
		.createClip("00:07:32/19").setTimelapseRate(1),
	daveExcusesE               : vids.daveExcuses
		.skipClip("00:08:42/23")
		.createClip("00:08:53/20").setTimelapseRate(1),
	daveExcusesF               : vids.daveExcuses
		.addAnchorTime("16T15:09-03", "00:08:54/22", ts.digital)
		.addAnchorTime("16T15:09-03", "00:08:58/04", ts.digital)
		.createClip("00:08:58/09").setTimelapseRate(1),
	daveExcusesG               : vids.daveExcuses
		.skipClip("00:15:16/02")
		.createClip("00:15:21/04").setTimelapseRate(1),
	daveExcusesH               : vids.daveExcuses
		.createClip("00:15:27/13").setTimelapseRate(1),
	daveExcusesI               : vids.daveExcuses
		.skipClip("00:15:45/14")
		.createClip("00:15:47/24").setTimelapseRate(1),
	daveExcusesJ               : vids.daveExcuses
		.skipClip("00:15:53/11")
		.createClip("00:15:57/15").setTimelapseRate(1),
	daveExcusesK               : vids.daveExcuses
		.skipClip("00:15:57/16")
		.createClip("00:16:09/14").setTimelapseRate(1),
	daveExcusesL               : vids.daveExcuses
		.skipClip("00:16:36/18")
		.createClip("00:16:42/22").setTimelapseRate(1),
	daveExcusesM               : vids.daveExcuses
		.skipClip("00:16:57/22")
		.createClip("00:17:02/13").setTimelapseRate(1),
	daveExcusesN               : vids.daveExcuses
		.createClip("00:17:04/05").setTimelapseRate(1),
	daveExcusesO               : vids.daveExcuses
		.skipClip("00:17:08/09")
		.createClip("00:17:11/15").setTimelapseRate(1),
	daveExcusesP               : vids.daveExcuses
		.skipClip("00:17:37/17")
		.createClip("00:17:43/21").setTimelapseRate(1),
	daveExcusesQ               : vids.daveExcuses
		.skipClip("00:18:06/02")
		.createClip("00:18:11/21").setTimelapseRate(1),
	daveExcusesR               : vids.daveExcuses
		.createClip("00:18:20/05").setTimelapseRate(1),
	daveExcusesS               : vids.daveExcuses
		.skipClip("00:18:22/20")
		.createClip("00:18:26/12").setTimelapseRate(1),
	daveExcusesT               : vids.daveExcuses
		.skipClip("00:21:14/20")
		.createClip("00:21:18/09").setTimelapseRate(1),
	daveExcusesU               : vids.daveExcuses
		.skipClip("00:22:36/19")
		.createClip("00:22:39/13").setTimelapseRate(1),
	daveExcusesV               : vids.daveExcuses
		.createClip("00:22:47/11").setTimelapseRate(1),
	daveExcusesW               : vids.daveExcuses
		.createClip("00:22:57/04").setTimelapseRate(1),
	daveExcusesX               : vids.daveExcuses
		.skipClip("00:23:09/05")
		.createClip("00:23:20/21").setTimelapseRate(1),
	daveExcusesY               : vids.daveExcuses
		.skipClip("00:25:42/19")
		.createClip("00:26:11/24").setTimelapseRate(1),
	daveExcusesZ               : vids.daveExcuses
		.skipClip("00:27:51/15")
		.createClip("00:27:56/11").setTimelapseRate(1),
	daveExcusesZA              : vids.daveExcuses
		.skipClip("00:28:02/17")
		.createClip("00:28:05/22").setTimelapseRate(1), // TODO: what's the speedup?
	daveExcusesZB              : vids.daveExcuses
		.createClip("00:28:08/02").setTimelapseRate(1), // TODO: what's the speedup?
	daveExcusesZC              : vids.daveExcuses
		.skipClip("00:28:24/24")
		.createClip("00:28:28/05").setTimelapseRate(1),
	daveExcusesZD              : vids.daveExcuses
		.skipClip("00:28:32/21")
		.createClip("00:28:38/16").setTimelapseRate(1),
	daveExcusesZE              : vids.daveExcuses
		.createClip("00:28:42/07").setTimelapseRate(1),
	daveExcusesZF              : vids.daveExcuses
		.skipClip("00:28:47/05")
		.createClip("00:28:52/09").setTimelapseRate(1),
	daveExcusesZG              : vids.daveExcuses
		.createClip("00:29:00/17").setTimelapseRate(1),
	daveExcusesZH              : vids.daveExcuses
		.createClip("00:29:15/05").setTimelapseRate(1),
	daveExcusesZI              : vids.daveExcuses
		.skipClip("00:29:40/12")
		.createClip("00:29:45/17").setTimelapseRate(1),
	daveSunspotsA              : vids.daveSunspots
		.skipClip("00:01:52/23") // The clip around 0:15 has a longer version in "Solar photography destroys Flat Earth?" at 0:53
		.createClip("00:02:03/20").setTimelapseRate(1),
	daveSunspotsB              : vids.daveSunspots
		.skipClip("00:05:01/24")
		.createClip("00:05:05/11").setTimelapseRate(1),
	daveSunspotsC              : vids.daveSunspots
		.createClip("00:05:08/05").setTimelapseRate(1),
	daveSunspotsD              : vids.daveSunspots
		.skipClip("00:05:22/14")
		.createClip("00:05:27/22").setTimelapseRate(1),
	daveSunspotsE              : vids.daveSunspots
		.skipClip("00:05:55/19")
		.createClip("00:05:57/15").setTimelapseRate(1),
	daveSunspotsF              : vids.daveSunspots
		.createClip("00:06:01/04").setTimelapseRate(1),
	daveSunspotsG              : vids.daveSunspots
		.skipClip("00:06:22/16")
		.createClip("00:06:25/05").setTimelapseRate(1), // First day, during 1 hour waiting for luggage to arrive.
	daveSunspotsH              : vids.daveSunspots
		.skipClip("00:06:26/14")
		.createClip("00:06:30/08").setTimelapseRate(1),
	daveSunspotsI              : vids.daveSunspots
		.createClip("00:06:35/21").setTimelapseRate(1),
	daveSunspotsJ              : vids.daveSunspots
		.skipClip("00:07:24/21")
		.createClip("00:07:30/13").setTimelapseRate(1),
	daveSunspotsK              : vids.daveSunspots
		.skipClip("00:10:28/19")
		// At 15:39 in the video we see file 101-0115 was #1574 on the SD-card. At 15:20 we see a photo which was #1348 on the SD-card with camera time 2024-12-15 19:37.
		// By counting back 226 images, that photo should be file 100-9889 with camera time 2024-12-15 19:25 correlating to 2024-12-15 19:37 on the phone. 12 minutes behind.
		.addAnchorTime("15T19:38:16-00", "10:48/19", new TimeSource("Corrected photo file time stamp (+12 minutes)", -60*1000, +60*1000))
		.createClip("00:10:54/05").setTimelapseRate(3213.7007874015748031496062992126), // 23:26:17 - 00:45:49 = 22:40:28 = 81628s | 10:54/04 - 10:28/19 = 25.4s
	daveSunspotsL              : vids.daveSunspots
		.skipClip("00:17:23/01")
		.createClip("00:17:33/19").setTimelapseRate(1), // TODO
	daveSunspotsM              : vids.daveSunspots
		.createClip("00:17:39/11").setTimelapseRate(1), // TODO
	daveSunspotsN              : vids.daveSunspots
		.createClip("00:17:47/09").setTimelapseRate(1), // TODO
	daveSunspotsO              : vids.daveSunspots
		.createClip("00:17:54/08").setTimelapseRate(1), // TODO
	daveSunspotsP              : vids.daveSunspots
		.skipClip("00:18:31/18")
		.createClip("00:18:37/09").setTimelapseRate(1),
	// Dave McKeegan / streams
	daveLive                   : vids.daveLive
		.addAnchorTime("15T21:05-03", "00:03:34.0", ts.digitalRead)
		.addAnchorTime("15T21:51-03", "00:50:06/10", ts.digital)
		.addAnchorTime("15T21:51-03", "00:50:11/23", ts.digital)
		.addAnchorTime("15T22:51-03", "01:49:33/02", ts.digital)
		.addAnchorTime("15T22:51-03", "01:49:34/07", ts.digital)
		.createClip(), // TODO: At 4:02 Will Duffy insta360 A read 23h 42m recording time as a potential sync point.

	// Jeran Campanella / videos
	jeranFlightAA              : vids.jeranFlight
		.skipClip("00:00:39/25") // Intro
		.addAnchorTime("10T07:36-08", "00:01:54/09", ts.digitalFlip)
		.createClip("00:03:33/26"), // Driving to the airport in San José
	jeranFlightAB              : vids.jeranFlight
		.createClip("00:05:26/12"), // Standing at the gate, departure at 9:33am
	jeranFlightAC              : vids.jeranFlight
		.addAnchorTime("10T09:25:05-08", "00:05:55/08", ts.sun)
		.addAnchorTime("10T09:37:35-08", "00:06:20/08", ts.sun)
		.createClip("00:07:32/07"), // Plane taxiing
	jeranFlightAD              : vids.jeranFlight
		.addAnchorTime("10T09:31:19-08", "00:07:37/04", ts.sun)
		.createClip("00:08:51/19"), // Plane taking off
	jeranFlightAE              : vids.jeranFlight
		.addAnchorTime("10T15:17-08", "00:08:51/19", ts.takeoff)
		.createClip("00:10:08/23"), // Plane: CC-BBG, Flight: LA603, Departure: 10 Dec 15:17, Arrival: 11 Dec 06:15
	jeranFlightAF              : vids.jeranFlight
		.addAnchorTime("14T09:30-03", "00:10:22/23", ts.digitalFlip)
		.createClip("00:15:12/24"), // Punta Arenas airport
	jeranFlightAG              : vids.jeranFlight
		//.addAnchorTime("14T12:58-00", "00:15:12/24"); // based on GPS from Critical Think
		.createClip("00:15:58/06"), // leaving airport building
	jeranFlightAH              : vids.jeranFlight
		//.addAnchorTime("14T13:00-00", "00:15:58/06"); // based on GPS from Critical Think
		.createClip("00:16:10/21"), // stuffing bags
	jeranFlightAI              : vids.jeranFlight
		//.addAnchorTime("14T13:26-00", "00:16:10/21"); // based on GPS from Critical Think
		.createClip("00:16:49/11"), // tarmac
	jeranFlightAJ              : vids.jeranFlight
		//.addAnchorTime("14T13:33-00", "00:16:49/11"); // based on GPS from Critical Think
		.createClip("00:17:55/08"), // boarding
	jeranFlightAK              : vids.jeranFlight
		.createClip("00:19:20/16"), // announcement
	jeranFlightAL              : vids.jeranFlight
		//.addAnchorTime("14T13:43:51-00", "00:19:34/27", 0); // based on GPS from Critical Think
		.createClip("00:21:30/24"), // take-off
	jeranFlightAM              : vids.jeranFlight
		.createClip("00:22:16/23"),
	jeranFlightAN              : vids.jeranFlight
		.createClip("00:23:04/02"),
	jeranFlightAO              : vids.jeranFlight
		.createClip("00:23:52/09"),
	jeranFlightAP              : vids.jeranFlight
		.createClip("00:25:05/16"),
	jeranFlightAQ              : vids.jeranFlight
		.addAnchorTime("14T11:08-03", "00:25:05/16", ts.digital)
		.addAnchorTime("14T11:08-03", "00:25:10/03", ts.digital)
		.createClip("00:25:30/15"),
	jeranFlightAR              : vids.jeranFlight
		.addAnchorTime("14T11:10-03", "00:25:46/29", ts.digital)
		.addAnchorTime("14T11:10-03", "00:25:57/02", ts.digital)
		.createClip("00:26:03/05"),
	jeranFlightAS              : vids.jeranFlight
		.addAnchorTime("14T11:26-03", "00:26:05/20", ts.digital)
		.addAnchorTime("14T11:27-03", "00:26:20/11", ts.digital)
		.createClip("00:28:11/02"),
	jeranFlightAT              : vids.jeranFlight
		.addAnchorTime("14T12:10-03", "00:29:25/12", ts.digital)
		.addAnchorTime("14T12:11-03", "00:30:03/13", ts.digital)
		.createClip("00:30:05/25"),
	jeranFlightAU              : vids.jeranFlight
		.addAnchorTime("14T12:42-03", "00:30:41/22", ts.digital)
		.addAnchorTime("14T12:42-03", "00:30:46/02", ts.digital) // display shows ETA 1:42
		.createClip("00:33:57/08"),
	jeranFlightAV              : vids.jeranFlight
		.createClip("00:34:13/18"),
	jeranFlightAW              : vids.jeranFlight
		.createClip("00:34:43/11"),
	jeranFlightAX              : vids.jeranFlight
		.createClip("00:35:32/08"),
	jeranFlightAY              : vids.jeranFlight
		.createClip("00:35:43/10"),
	jeranFlightAZ              : vids.jeranFlight
		.createClip("00:36:10/09"),
	jeranFlightBA              : vids.jeranFlight
		.createClip("00:36:27/01"),
	jeranFlightBB              : vids.jeranFlight
		.addAnchorTime("14T13:25-03", "00:43:16/24", ts.eta) // display shows ETA 0:59, so 43m later
		.createClip("00:43:32/28"),
	jeranFlightBC              : vids.jeranFlight
		.addAnchorTime("14T13:27-03", "00:43:53/04", ts.eta) // display shows ETA 0:57, so 45m later
		.createClip("00:43:57/03"),
	jeranFlightBD              : vids.jeranFlight
		.addAnchorTime("14T13:30-03", "00:44:10/10", ts.digital)
		.addAnchorTime("14T13:30-03", "00:44:22/17", ts.digital)
		.createClip("00:44:24/19"),
	jeranFlightBE              : vids.jeranFlight
		.addAnchorTime("14T13:34-03", "00:44:33/24", ts.digital)
		.addAnchorTime("14T13:35-03", "00:44:51/07", ts.digital)
		.createClip("00:44:54/06"),
	jeranFlightBF              : vids.jeranFlight
		.createClip("00:45:55/15"),
	jeranFlightBG              : vids.jeranFlight
		.createClip("00:49:46/12"), // starts with "landing in 15 min"
	jeranFlightBH              : vids.jeranFlight
		.addAnchorTime("14T14:18-03", "00:49:55/10", ts.digital)
		.addAnchorTime("14T14:20-03", "00:51:02/07", ts.digital)
		.createClip("00:51:30/24"),
	jeranFlightBI              : vids.jeranFlight
		.createClip("00:52:01/08"),
	jeranFlightBJ              : vids.jeranFlight
		.addAnchorTime("14T14:23-03", "00:52:09/19", ts.digital)
		.addAnchorTime("14T14:23-03", "00:52:15/11", ts.digital)
		.createClip("00:54:22/04"),
	jeranFlightBK              : vids.jeranFlight
		//.addAnchorTime("14T17:32:36-00", "00:57:42/00") // based on GPS from Critical Think
		.createClip("00:59:36/29"),
	jeranFlightBL              : vids.jeranFlight
		//.addAnchorTime("14T17:37:24-00", "01:03:55/00") // based on GPS from Critical Think
		.createClip("01:16:19/03"),
	jeranFlightBM              : vids.jeranFlight
		.createClip("01:17:12/20"),
	jeranFlightBN              : vids.jeranFlight
		.createClip("01:23:27/00"),
	jeranFlightBO              : vids.jeranFlight
		//.addAnchorTime("14T15:29-03", "01:29:12/09") // based on wall clock
		.createClip("01:29:14/27"),
	jeranFlightBP              : vids.jeranFlight
		.createClip("01:31:08/17"), // happens before diner at 7pm
	jeranFlightBQ              : vids.jeranFlight
		.createClip("01:31:29/26"),
	jeranFlightBR              : vids.jeranFlight
		.createClip("01:33:28/15"), // SYNC with live stream
	jeranFlightBS              : vids.jeranFlight
		.createClip("01:34:01/05"),
	jeranFlightBT              : vids.jeranFlight
		.createClip("01:36:35/24"),
	jeranFlightBU              : vids.jeranFlight
		.createClip("01:49:58/03"),
	jeranFlightBV              : vids.jeranFlight
		.createClip("01:50:02/09"),
	jeranFlightBW              : vids.jeranFlight
		.createClip("01:53:21/06"),
	jeranFlightBX              : vids.jeranFlight
		.createClip("01:53:40/06"),
	jeranFlightBY              : vids.jeranFlight
		.createClip("01:55:43/19"),
	jeranFlightBZ              : vids.jeranFlight
		.createClip("01:59:38/24"),
	jeranFlightCA              : vids.jeranFlight
		.createClip("02:05:27/25"),
	jeranFlightCB              : vids.jeranFlight
		.createClip("02:06:29/13"),
	jeranFlightCC              : vids.jeranFlight
		.createClip("02:07:06/00"),
	jeranFlightCD              : vids.jeranFlight
		.createClip("02:08:48/22"),
	jeranFlightCE              : vids.jeranFlight
		.createClip("02:10:30/23"),
	jeranFlightCF              : vids.jeranFlight
		.createClip("02:26:04/19"),
	jeranFlightCG              : vids.jeranFlight
		.createClip("02:28:06/09"),
	jeranFlightCH              : vids.jeranFlight
		.createClip("02:30:13/16"),
	jeranFlightCI              : vids.jeranFlight
		.createClip("02:30:56/01"),
	jeranFlightCJ              : vids.jeranFlight
		.createClip("02:31:37/20"),
	jeranFlightCK              : vids.jeranFlight
		.createClip("02:33:14/18"),
	jeranFlightCL              : vids.jeranFlight
		.createClip("02:33:36/16"),
	jeranFlightCM              : vids.jeranFlight
		.createClip("02:34:40/19"),
	jeranFlightCN              : vids.jeranFlight
		.createClip("02:35:06/05"),
	jeranFlightCO              : vids.jeranFlight
		.createClip("02:57:55/13"),
	jeranFlightCP              : vids.jeranFlight
		.createClip("02:58:12/26"),
	jeranFlightCQ              : vids.jeranFlight
		.createClip("03:00:01/28"),
	jeranFlightCR              : vids.jeranFlight
		.addAnchorTime("16T07:04-03", "03:02:17/28", ts.digital)
		.addAnchorTime("16T07:04-03", "03:02:28/13", ts.digital)
		.createClip("03:02:53/21"),
	jeranFlightCS              : vids.jeranFlight
		.addAnchorTime("16T19:44:07-03", "03:03:03/20", ts.analog)
		.createClip("03:05:26/01"),
	jeranFlightCT              : vids.jeranFlight
		.createClip("03:31:04/02"),
	jeranFlightCU              : vids.jeranFlight
		.createClip("03:39:26/09"),
	jeranFlightCV              : vids.jeranFlight
		.createClip("03:48:05/01"),
	jeranFlightCW              : vids.jeranFlight
		.createClip("03:48:44/18"),
	jeranFlightCX              : vids.jeranFlight
		.createClip("03:55:13/29"),
	jeranFlightCY              : vids.jeranFlight
		.createClip("03:59:05/19"),
	jeranFlightCZ              : vids.jeranFlight
		.createClip("04:03:31/07"),
	jeranFlightDA              : vids.jeranFlight
		.createClip("04:07:36/28"),
	jeranFlightDB              : vids.jeranFlight
		.createClip("04:10:53/24"),
	jeranFlightDC              : vids.jeranFlight
		.createClip("04:24:31/27"),
	jeranFlightDD              : vids.jeranFlight
		.createClip("04:27:18/01"),
	jeranFlightDE              : vids.jeranFlight
		.createClip("04:31:14/07"),
	jeranFlightDF              : vids.jeranFlight
		.createClip("04:36:30/13"),
	jeranFlightDG              : vids.jeranFlight
		.addAnchorTime("17T12:44:55-03", "04:37:01/00", ts.analog)
		.createClip("04:39:12/17"),
	jeranFlightDH              : vids.jeranFlight
		.addAnchorTime("17T12:44:55-03", "04:37:01/00", ts.roundabout)
		.createClip("04:45:24/01"),
	jeranFlightDI              : vids.jeranFlight
		.createClip("04:46:55/16"),
	jeranFlightDJ              : vids.jeranFlight
		.createClip("04:48:08/01"),
	jeranFlightDK              : vids.jeranFlight
		.createClip("04:48:39/19"),
	jeranFlightDL              : vids.jeranFlight
		.createClip("04:49:47/20"),
	jeranFlightDM              : vids.jeranFlight
		.createClip("04:50:09/20"),
	jeranFlightDN              : vids.jeranFlight
		.addAnchorTime("17T14:45-03", "04:55:36/16", ts.digital)
		.addAnchorTime("17T14:45-03", "04:56:13/04", ts.digital)
		.createClip("04:56:58/19"),
	jeranFlightDO              : vids.jeranFlight
		.createClip("04:57:45/29"),
	jeranFlightDP              : vids.jeranFlight
		.createClip("04:59:55/17"),
	jeranFlightDQ              : vids.jeranFlight
		.createClip("05:01:30/12"),
	jeranFlightDR              : vids.jeranFlight
		.createClip("05:02:18/10"),
	jeranFlightDS              : vids.jeranFlight
		.addAnchorTime("17T18:18:45-00", "05:02:42/16", ts.gps60)
		.addAnchorTime("17T15:18-03", "05:02:49/14", ts.digital)
		.addAnchorTime("17T15:18-03", "05:03:08/25", ts.digital)
		.createClip("05:03:24/00"),
	jeranFlightDT              : vids.jeranFlight
		.addAnchorTime("17T15:35-03", "05:03:31/16", ts.digital)
		.addAnchorTime("17T15:35-03", "05:03:32/25", ts.digital)
		.createClip("05:03:43/17"),
	jeranFlightDU              : vids.jeranFlight
		.addAnchorTime("17T15:40-03", "05:03:44/09", ts.digital)
		.addAnchorTime("17T15:40-03", "05:04:02/24", ts.digital)
		.createClip("05:04:02/25"),
	jeranFlightDV              : vids.jeranFlight
		.addAnchorTime("17T16:19-03", "05:04:07/18", ts.digital)
		.addAnchorTime("17T16:20-03", "05:04:25/03", ts.digital)
		.createClip("05:04:59/25"),
	jeranFlightDW              : vids.jeranFlight
		.createClip("05:05:23/15"),
	jeranFlightDX              : vids.jeranFlight
		.createClip("05:08:27/11"),
	jeranFlightDY              : vids.jeranFlight
		.addAnchorTime("17T19:34:20-00", "05:08:39/08", ts.gps60)
		.createClip("05:09:32/11"),
	jeranFlightDZ              : vids.jeranFlight
		.createClip("05:10:40/25"),
	jeranFlightEA              : vids.jeranFlight
		.addAnchorTime("17T18:31-03", "05:10:40/25", ts.digital)
		.addAnchorTime("17T18:31-03", "05:11:23/07", ts.digital)
		.createClip("05:12:30/11"),
	jeranFlightEB              : vids.jeranFlight
		.createClip("05:13:19/02"),
	jeranFlightEC              : vids.jeranFlight
		.createClip("05:13:47/28"),
	jeranFlightED              : vids.jeranFlight
		.createClip("05:14:35/12"),
	jeranFlightEE              : vids.jeranFlight
		.addAnchorTime("17T22:03:43-00", "05:14:35/12", ts.gps90)
		.createClip("05:14:45/07"),
	// Jeran Campanella / streams
	jeranPuntaArenas1          : vids.jeranPuntaArenas1
		.addAnchorTime("12T00:26:47-03", "00:30:23/00", ts.digitalFlip)
		.createClip(),
	jeranPuntaArenas2          : vids.jeranPuntaArenas2
		.addAnchorTime("12T23:30-03", "00:00:50.5", ts.digitalRead)
		.addAnchorTime("12T23:32-03", "00:02:24.0", ts.digitalRead)
		.addAnchorTime("12T23:45-03", "00:15:07.0", ts.roundabout)
		.createClip("00:38:09/21"),
	jeranPuntaArenas3          : vids.jeranPuntaArenas3
		.addAnchorTime("13T22:05-03", "00:05:39.0", ts.digitalRead)
		.addAnchorTime("13T22:18-03", "00:18:12.5", ts.digitalRead)
		.addAnchorTime("13T23:18-03", "01:18:45.0", ts.digitalRead)
		.createClip("01:22:06/08"),
	jeranLiveUG1A              : vids.jeranLiveUG1
		.createClip("00:03:15/20"),
	jeranLiveUG1B              : vids.jeranLiveUG1
		.createClip("00:06:56/26"),
	jeranLiveUG1C              : vids.jeranLiveUG1
		.createClip("00:08:48/25"),
	jeranLiveUG1D              : vids.jeranLiveUG1
		.createClip("00:18:29/28"),
	jeranLiveUG1E              : vids.jeranLiveUG1
		.createClip("00:21:37/25"),
	jeranLiveUG1F              : vids.jeranLiveUG1
		.createClip("00:22:16/26"),
	jeranLiveUG1G              : vids.jeranLiveUG1
		.createClip("00:23:08/11"),
	jeranLiveUG1H              : vids.jeranLiveUG1
		.createClip("00:25:44/25"),
	jeranLiveUG1I              : vids.jeranLiveUG1
		.createClip(),
	jeranLiveUG2               : vids.jeranLiveUG2
		.addAnchorTime("15T23:12-03", "00:09:43/26", ts.ytChat)
		.createClip(),
	jeranLiveSunspotsA         : vids.jeranLiveSunspots
		.createClip("00:05:05.663"),
	jeranLiveSunspotsB         : vids.jeranLiveSunspots
		.skipClip("00:05:09/26") // repeat segment
		.addAnchorTime("16T13:46-03", "00:05:49.5", ts.digitalRead)
		.addAnchorTime("16T13:46-03", "00:05:53.0", ts.digitalRead)
		.addAnchorTime("16T13:50-03", "00:09:20.0", ts.compromised)
		.createClip(),
	jeranLiveLastA             : vids.jeranLiveLast
		.createClip("00:07:13/15"),
	jeranLiveLastB             : vids.jeranLiveLast
		.createClip("00:08:02/26"),
	jeranLiveLastC             : vids.jeranLiveLast
		.createClip("00:08:08/09"),
	jeranLiveLastD             : vids.jeranLiveLast
		.skipClip("00:08:09/29") // repeat segment
		.createClip("00:09:35/26"),
	jeranLiveLastE             : vids.jeranLiveLast
		.createClip("00:20:03/29"),
	jeranLiveLastF             : vids.jeranLiveLast
		.createClip("00:25:12/17"),
	jeranLiveLastG             : vids.jeranLiveLast
		.skipClip("00:25:14/26") // repeat segment
		.createClip("00:26:05/26"),
	jeranLiveLastH             : vids.jeranLiveLast
		.skipClip("00:26:06/23") // repeat segment
		.createClip(),

	// Jonathan Mariande / shorts
	jonathanShort              : vids.jonathanShort
		.setCoordinates(-79.75, -82.5)
		.createClip(), // TODO: seems to be 07:54 to 08:47 local time on the 15th, 16th, 17th (probably 16th judging by the weather)
	// Jonathan Mariande / live
	jonathanLive               : vids.jonathanLive
		.addAnchorTime("15T23:47-03", "00:09:26/00", ts.digitalRead)
		.createClip(),
	// Jonathan Mariande / TikTok
	jonathanWelcome            : vids.jonathanWelcome.createClip(),
	jonathanDistanceA          : vids.jonathanDistanceA.createClip(),
	jonathanIRThermal          : vids.jonathanIRThermal.createClip(),
	jonathanSnowblindness      : vids.jonathanSnowblindness.createClip(),
	jonathanToilet             : vids.jonathanToilet.createClip(),
	jonathanSnowcat            : vids.jonathanSnowcat.createClip(),
	jonathanIce                : vids.jonathanIce.createClip(),
	jonathanCrunch             : vids.jonathanCrunch.createClip(),
	jonathanSilent             : vids.jonathanSilent.createClip(),

	// Mark Herman / videos
	markBehindScenes           : vids.markBehindScenes.createClip(),
	mark360Disembark           : vids.mark360Disembark.createClip(),
	mark360DisembarkPhone      : vids.mark360DisembarkPhone.createClip(),
	mark360CampTour            : vids.mark360CampTour
		.addAnchorTime("14T15:23:00-03", "00:13:32/00", ts.analog)
		.createClip(),
	markQA2                    : vids.markQA2
		.skipClip("00:06:58/10")
		.createClip("00:07:29/02"),

	// Micheal Toon (as McFlatty) / videos
	flattyPantyArena           : vids.flattyPantyArena.createClip(),
	flatty24Suns               : vids.flatty24Suns.createClip(),
	flattyHomeA                : vids.flattyHome.createClip("00:00:17/02"),
	flattyHomeB                : vids.flattyHome.createClip("00:00:41/02"),
	flattyHomeC                : vids.flattyHome.createClip(),
	flattyFiguredItOut         : vids.flattyFiguredItOut.createClip(),
	flattyIRThermometer        : vids.flattyIRThermometer.createClip(),
	flattyEscape               : vids.flattyEscape.createClip(),

	// Micheal Toon (as MCToon Live) / streams
	mctoonPuntaArenasLive1     : vids.mctoonPuntaArenasLive1.createClip(),
	mctoonPuntaArenasLive2A    : vids.mctoonPuntaArenasLive2.createClip("01:11:04/11"),
	mctoonPuntaArenasLive2B    : vids.mctoonPuntaArenasLive2.skipClip("01:11:19/00").createClip(),
	mctoonPuntaArenasLive3     : vids.mctoonPuntaArenasLive3
		.addAnchorTime("14T01:00-03", "02:00:07.0", ts.hourMention)
		.createClip(),
	mctoonLive100Percent       : vids.mctoonLive100Percent
		.setCoordinates(-79.740, -82.80583)
		.addAnchorTime("15T02:06-03", "00:06:35.7", ts.digitalRead)
		.addAnchorTime("15T02:18-03", "00:18:43.0", ts.digitalRead)
		.addAnchorTime("15T02:19-03", "00:19:31/10", ts.digital)
		.addAnchorTime("15T02:23-03", "00:23:07.0", ts.digitalRead)
		// TODO: Some recollection of when Dave McKeegan did what in Punta Arenas.
		.addAnchorTime("15T02:29-03", "00:29:45.0", ts.digitalRead)
		.addAnchorTime("15T02:30-03", "00:30:17.5", ts.digitalRead)
		.addAnchorTime("15T03:12-03", "01:12:20.8", ts.digitalRead)
		//.addAnchorTime("15T03:41-03", "01:40:55.5", ts.digitalRead) // conflicts
		.addAnchorTime("15T03:46-03", "01:46:00.3", ts.digitalRead)
		//.addAnchorTime("15T03:53:42.5-03", "01:53:36/28", ts.digitalFlip) // conflicts
		.addAnchorTime("15T03:54-03", "01:53:59/10", ts.digital)
		//.addAnchorTime("15T04:33-03", "02:32:58.0", ts.digitalRead) // conflicts
		.createClip("02:46:28/19"),
	mctoonLiveBack             : vids.mctoonLiveBack
		.addAnchorTime("19T00:53-03", "00:47:09/21", ts.digital)
		.addAnchorTime("19T00:53-03", "00:47:17/05", ts.digital)
		.addAnchorTime("19T01:46-03", "01:40:33/06", ts.digital)
		.addAnchorTime("19T01:46-03", "01:40:34/19", ts.digital)
		.addAnchorTime("19T01:58-03", "01:52:19.5", ts.digitalRead)
		.addAnchorTime("19T01:58-03", "01:52:19.5", ts.digitalRead)
		.addAnchorTime("19T01:58-03", "01:52:19.5", ts.digitalRead)
		.addAnchorTime("19T05:11-03", "05:04:57.5", ts.digitalRead)
		.createClip(),

	// Micheal Toon (as Conspiracy Toonz) / videos
	mctoon2ToGo                : vids.mctoon2ToGo
		.addAnchorTime("12T02:00:53-03", "00:09:56/11", ts.moon)
		.addAnchorTime("12T02:00:08-03", "00:11:05/27", ts.moon)
		.createClip(), // TODO: this is after the flat earthers arrived
	mctoonMarathon             : vids.mctoonMarathon
		.addAnchorTime("12T02:39:59-03", "00:01:33/20", ts.moon)
		.createClip("00:01:47/08"),
	mctoon1ToGo                : vids.mctoon1ToGo
		.addAnchorTime("12T23:51:52-03", "00:10:25/21", ts.moon)
		.createClip(),
	mctoon0ToGo                : vids.mctoon0ToGo
		.addAnchorTime("14T03:33:06-03", "00:00:00", new TimeSource("Mentions that it is the day they fly, so after the midnight live stream, and it is still dark, so before sunrise.", -5344000, +5344000))
		.createClip(),
	mctoonFlightTl             : vids.mctoonFlightTl.createClip(),
	mctoonBlueIceRunway        : vids.mctoonBlueIceRunway.createClip(),
	mctoon360Part1A            : vids.mctoon360Part1.createClip("09:59:57/10"),
	mctoon360Part1B            : vids.mctoon360Part1.createClip(),
	mctoon360Part2             : vids.mctoon360Part2.createClip(),
	mctoon360Part3             : vids.mctoon360Part3.createClip(),
	mctoonSunDialShadow        : vids.mctoonSunDialShadow.skipClip("00:00:14/34").createClip(),
	mctoonSunDialSun           : vids.mctoonSunDialSun.skipClip("00:00:13/20").createClip(),
	mctoonOakley               : vids.mctoonOakley
		.addAnchorTime("15T17:30-03", "00:02:00/10", ts.digitalFlip)
		.createClip("00:07:33/22"),
	mctoonFinalDayA            : vids.mctoonFinalDay
		.createClip("00:00:12/06"),
	mctoonFinalDayFlashback    : vids.mctoonFinalDay
		.skipClip("00:00:13/11")
		.createClip("00:01:16/19"),
	mctoonFinalDayB            : vids.mctoonFinalDay
		.skipClip("00:01:18/08")
		.createClip("00:08:42/29"),
	mctoonFinalDayC            : vids.mctoonFinalDay
		.skipClip("00:08:44/25")
		.addAnchorTime("19T12:20-03", "00:15:53/15", ts.analog) // TODO: or 16:00?
		.createClip(),
	mctoonClockApp             : vids.mctoonClockApp.createClip("00:08:20/16"), // TODO: Photo in hotel on 19th, 21:58:29 local
	// Micheal Toon (as Conspiracy Toonz) / streams
	mctoonShowingExperiments   : vids.mctoonShowingExperiments.createClip(), // TODO: Will signed the Jeranometer before this: 12/15

	// Wheres Wally / videos
	wallyJeranometer           : vids.wallyJeranometer
		.skipClip("00:02:24/06")
		.createClip("00:03:13/18"),
	wallyGreenscreen           : vids.wallyGreenscreen
		.skipClip("00:00:08/26")
		.createClip("00:01:21/01"),
	wallyDrone                 : vids.wallyDrone
		.addAnchorTime("16T01:40:00-00", "00:16:58/53", ts.digitalFlip)
		.createClip(),

	// Will Duffy / videos
	willPuntaArenas            : vids.willPuntaArenas.createClip(),
	willTenseSituation         : vids.willTenseSituation.createClip(), // TODO: after Mark Herman's arrival
	willLastUpdateBeforeUG     : vids.willLastUpdateBeforeUG.createClip(), // TODO: One day after an interview with marathon runner. "Last night" ate eel, slept till 4:45am, went out with the drone and met Dave with a tripod.
	willObservationArmy        : vids.willObservationArmy.createClip(), // TODO: After "2 full days", so 16th afternoon.
	will360Part1               : vids.will360Part1.createClip().enableAutoDuration(),
	will360Part2               : vids.will360Part2.createClip().enableAutoDuration(),
	will360Part3               : vids.will360Part3.createClip(),
	willStartrailsA            : vids.willStartrails
		.skipClip("00:10:55/23")
		.createClip("00:11:05/26").setTimelapseRate(1),
	willStartrailsB            : vids.willStartrails
		.skipClip("00:11:10/20")
		.createClip("00:11:18/08").setTimelapseRate(1),
	willStartrailsC            : vids.willStartrails
		.skipClip("00:11:34/24")
		.createClip("00:11:43/21").setTimelapseRate(1), // TODO
	willSunriseSunsetPuntaArenasA : vids.willSunriseSunsetPuntaArenas
		.skipClip("00:16:40/04")
		.addAnchorTime("12T18:27:59-03", "00:16:46/07", ts.sun) // Based on weather conditions, the 12th had the least clouds in the evening.
		.createClip("00:16:50/02").setTimelapseRate(1),
	willSunriseSunsetPuntaArenasB : vids.willSunriseSunsetPuntaArenas
		.skipClip("00:16:56/02")
		.createClip("00:17:04/10").setTimelapseRate(1),
	willSunriseSunsetPuntaArenasC : vids.willSunriseSunsetPuntaArenas
		.skipClip("00:17:48/04")
		.addAnchorTime("19T05:20:00-03", "00:18:29", ts.sun) // TODO: Which day? (11th - 14th, 18th, 19th)
		.createClip("00:18:33/23").setTimelapseRate(1),
	willSunriseSunsetPuntaArenasD : vids.willSunriseSunsetPuntaArenas
		.skipClip("00:21:48/14")
		.addAnchorTime("12T05:19:00-03", "00:21:53/21", ts.sun) // TODO: Which day? (11th - 14th, 18th, 19th)
		.createClip("00:22:02/17").setOwner(peeps.jonathan).setTimelapseRate(1), // TODO
	willSecond360                 : vids.willSecond360.createClip(),
	// Will Duffy / streams
	willMidnightAntarctica        : vids.willMidnightAntarctica.createClip(),
	willNoGreenscreens            : vids.willNoGreenscreens.createClip(),
	willLiveAntarctica            : vids.willLiveAntarctica.createClip(),
	willFinalDayLive              : vids.willFinalDayLive.createClip(),
};

// Order some clips to be sequential and non-overlapping.
Clip.orderClips(clips.mctoonPuntaArenasLive3, clips.mctoon0ToGo);
Clip.orderClips(clips.mctoonFinalDayFlashback, clips.mctoonFinalDayA, clips.mctoonFinalDayB, clips.mctoonFinalDayC);
Clip.orderClips(clips.austin24hPart1, clips.austin24hPart2, clips.austin24hPart3);
Clip.orderClips(clips.mctoon360Part1A, clips.mctoon360Part1B, clips.mctoon360Part2, clips.mctoon360Part3);
Clip.orderClips(clips.will360Part1, clips.will360Part2, clips.will360Part3);
Clip.orderClips(clips.daveSunspotsP, clips.daveSunspotsH, clips.daveSunspotsI); // First sunspot photo tests.

// Videos that recorded hours or days apart, but have a common clock allowing us to space them out correctly relative to each other.
timeline.chronology(vids.criticalFlight1Tl, "00:13:38/08", vids.criticalFlight2Tl, "00:05:10/11", 4, 7, 0, 0);
timeline.chronology(vids.criticalFlight2Tl, "00:05:10/11", vids.criticalFlight3Tl, "00:00:05/02", 3, 2, 0, 0);

// Punta Arenas
timeline.addSyncPoint(vids.daveSunspots, "00:17:25/17", vids.daveSunspots, "00:17:34/18");
//timeline.addSyncPoint(vids.daveSunspots, "00:17:33/18", vids.daveSunspots, "00:17:38/15"); // TODO: Do not uncomment, just for the timelapse calculation. +8.040s / +3.880s
timeline.addSyncPoint(vids.daveSunspots, "00:17:24/17", vids.daveSunspots, "00:17:40/04"); // ident
//timeline.addSyncPoint(vids.daveSunspots, "00:17:24/24", vids.daveSunspots, "00:17:45/12"); // TODO: Do not uncomment, just for the timelapse calculation.
// Flight to Union Glacier
vids.austin24hPart1.concat(vids.austin24hPart2);
timeline.addSyncPoint(vids.criticalFlight2Tl, "00:00:32/16", vids.daveToUGTl, "00:00:09/00", 1);
timeline.addSyncPoint(vids.criticalFlight2Tl, "00:08:18/05", vids.criticalFlight2Landing, "00:03:02/29"); // ident
timeline.addSyncPoint(vids.mctoonDji14103903, "01:00:29.475", vids.criticalFlight2Landing, "00:10:29/03", 0.15);
timeline.addSyncPoint(vids.daveSolarPhotography, "00:14:22/18", vids.daveToUGTl, "00:02:56/09");
timeline.addSyncPoint(vids.mctoonDji14103903, "00:53:14.524", vids.mctoonFlightTl, "00:09:14/09"); // ident
timeline.addSyncPoint(vids.mctoonDji14103903, "00:54:12.307", vids.daveToUGTl, "00:04:00/05", 0.25);
timeline.addSyncPoint(vids.mctoonDji14103903, "01:00:03.046", vids.mctoonBlueIceRunway, "00:07:50/21"); // ident
timeline.addSyncPoint(vids.daveVapegate, "00:11:53/14", vids.daveVapegate, "00:12:06/18");
timeline.addSyncPoint(vids.daveVapegate, "00:11:56/07", vids.daveVapegate, "00:12:09/24");
timeline.addSyncPoint(vids.daveVapegate, "00:11:59/16", vids.daveVapegate, "00:12:12/20");
timeline.addSyncPoint(vids.daveVapegate, "00:12:01/02", vids.daveVapegate, "00:12:23/15");
timeline.addSyncPoint(vids.mark360Disembark, "00:05:05/25", vids.daveVapegate, "00:12:23/13");
timeline.addSyncPoint(vids.daveToUGTl, "00:02:25/02", vids.daveExcuses, "00:15:18"); // roundabout
timeline.addSyncPoint(vids.daveVapegate, "00:12:03/16", vids.daveExcuses, "00:22:37/17");
timeline.addSyncPoint(vids.daveVapegate, "00:12:07/05", vids.daveExcuses, "00:22:45/13");
timeline.addSyncPoint(vids.mark360CampTour, "00:08:21/07", vids.daveSunspots, "00:05:03/07");
timeline.addSyncPoint(vids.mark360CampTour, "00:08:46/06", vids.daveSunspots, "00:05:06/04");
timeline.addSyncPoint(vids.mark360Disembark, "00:03:35/03", vids.mark360DisembarkPhone, "00:00:03/26");
timeline.addSyncPoint(vids.mark360Disembark, "00:05:40/01", vids.daveSunspots, "00:05:23/17");
timeline.addSyncPoint(vids.mark360Disembark, "00:05:45/28", vids.mctoonFlightTl, "00:09:34/19");
timeline.addSyncPoint(vids.markQA2, "00:07:28/12", vids.mctoonFlightTl, "00:05:07/19", 11);
// Dave’s & Will’s 360° footage
timeline.addSyncPoint(vids.will360Part1, "00:00:00/02", vids.austin24hPart1, "00:00:00/01");
timeline.addSyncPoint(vids.will360Part1, "00:55:39/00", vids.daveSolarPhotography, "00:05:48/15"); // TODO: could be aligned more precisely. Maybe when I have YT embeds.
timeline.addSyncPoint(vids.will360Part1, "06:33:19/07", vids.mctoonLive100Percent, "01:56:07/23", 0.04);
timeline.addSyncPoint(vids.will360Part1, "09:01:43/02", vids.daveVapegate, "00:09:57/10"); // roundabout
timeline.addSyncPoint(vids.will360Part1, "09:01:54/17", vids.daveSolarPhotography, "00:03:31/19");
timeline.addSyncPoint(vids.will360Part2, "02:13:35/13", vids.austin24hTl, "00:35:10/22");
timeline.addSyncPoint(vids.will360Part2, "07:16:01/20", vids.austin24hPart3, "00:16:31/07"); // ident
timeline.addSyncPoint(vids.will360Part2, "07:32:56/10", vids.willNoGreenscreens, "00:05:38/24");
timeline.addSyncPoint(vids.markBehindScenes, "00:04:08/21", vids.willNoGreenscreens, "00:06:00/27");
timeline.establishTimelapseRate(vids.daveTl360, "00:09:32/24", "00:18:10/06", vids.will360Part2, "00:16:37/29", "09:00:18/25");
timeline.addSyncPoint(vids.willNoGreenscreens, "00:06:16/10", vids.daveExcuses, "00:04:34/12");
timeline.addSyncPoint(vids.will360Part2, "08:24:33/21", vids.daveExcuses, "00:03:31/05"); // roundabout
timeline.addSyncPoint(vids.willNoGreenscreens, "00:06:57/18", vids.daveExcuses, "00:07:20/08");
timeline.addSyncPoint(vids.will360Part3, "00:03:49/24", vids.austin24hPart3, "02:33:45/13"); // ident
timeline.establishTimelapseRate(vids.daveTl, "00:00:36/07", "00:00:45/27", vids.will360Part3, "00:40:02/05", "05:52:21/18");
timeline.addSyncPoint(vids.will360Part3, "00:40:38/16", vids.mctoonOakley, "00:04:54/11", 0.04);
timeline.addSyncPoint(vids.daveTl, "00:00:36/08", vids.mctoonOakley, "00:05:22/22", 40);
timeline.addSyncPoint(vids.daveTl360, "00:01:27/00", vids.daveSolarPhotography, "00:06:09/21");
timeline.addSyncPoint(vids.daveTl360, "00:08:17/15", vids.daveSolarPhotography, "00:03:14/20");
timeline.addSyncPoint(vids.daveTl360, "00:08:17/18", vids.daveVapegate, "00:05:33/05");
timeline.addSyncPoint(vids.daveTl360, "00:08:18/05", vids.daveSolarPhotography, "00:03:18/05");
timeline.addSyncPoint(vids.daveTl360, "00:17:49/11", vids.daveVapegate, "00:09:44/06"); // roundabout
timeline.addSyncPoint(vids.will360Part1, "00:56:04/28", vids.daveExcuses, "00:27:51/15");
timeline.addSyncPoint(vids.will360Part1, "00:44:51/15", vids.daveExcuses, "00:28:38/21");
timeline.addSyncPoint(vids.daveTl360, "00:17:50/27", vids.daveExcuses, "00:29:09/19");
timeline.addSyncPoint(vids.daveTl360, "00:17:51/00", vids.daveExcuses, "00:28:52/22");
timeline.addSyncPoint(vids.will360Part1, "02:09:46", vids.daveExcuses, "00:29:40/12"); // roundabout
timeline.addSyncPoint(vids.daveSunspots, "00:07:26/08", vids.will360Part1, "00:58:10"); // roundabout
timeline.addSyncPoint(vids.daveSolarPhotography, "00:09:51/19", vids.daveSunspots, "00:02:03/09");
timeline.addSyncPoint(vids.daveSunspots, "00:01:57/23", vids.will360Part2, "08:43:35/06");
timeline.addSyncPoint(vids.will360Part3, "03:58:28/11", vids.jonathanIRThermal, "00:00:26.485");
// MCToon’s & Will’s 2nd 360° footage
timeline.addSyncPoint(vids.mctoon360Part1, "00:01:01/05", vids.mctoonSunDialSun, "00:00:13/31");
timeline.addSyncPoint(vids.mctoon360Part1, "00:08:39/12", vids.willLiveAntarctica, "00:05:15/04");
timeline.establishTimelapseRate(vids.mctoonSunDialShadow, "00:00:16/29", "00:01:03/49", vids.mctoon360Part1, "00:37:34/05", "09:59:55/06");
timeline.addSyncPoint(vids.mctoon360Part1, "00:56:42/20", vids.mctoonSunDialSun, "00:00:23/32");
timeline.addSyncPoint(vids.mctoon360Part1, "09:57:13/07", vids.mctoonSunDialSun, "00:02:00/45");
timeline.addSyncPoint(vids.willMidnightAntarctica, "00:05:36/25", vids.daveVapegate, "00:01:32/17");
timeline.addSyncPoint(vids.willSecond360, "00:03:10/24", vids.daveExcuses, "00:08:43");
timeline.addSyncPoint(vids.willSecond360, "00:10:33/21", vids.willObservationArmy, "00:00:32/30", 10);
timeline.addSyncPoint(vids.willSecond360, "00:11:49/10", vids.jeranLiveSunspots, "00:05:20", 20);
timeline.addSyncPoint(vids.willSecond360, "00:17:54/28", vids.mctoon360Part2, "08:05:23/26");
timeline.addSyncPoint(vids.willSecond360, "00:24:15/24", vids.daveSolarPhotography, "00:04:20/10", 150); // TODO: What's broken?
timeline.addSyncPoint(vids.willSecond360, "00:24:18/06", vids.daveSolarPhotography, "00:04:48", 150);
timeline.addSyncPoint(vids.willSecond360, "00:21:59/26", vids.mctoon360Part3, "00:13:01/03"); // roundabout
timeline.addSyncPoint(vids.will360Part3, "01:57:50", vids.jonathanIce, "00:00:00", 150); // roundabout
timeline.addSyncPoint(vids.will360Part3, "01:59:10", vids.jonathanSnowcat, "00:00:00", 80); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:30:25/16", vids.jonathanShort, "00:00:11/16"); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:30:27/14", vids.jonathanDistanceA, "00:00:25"); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:31:31/18", vids.jonathanToilet, "00:00:54.6"); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:32:06/23", vids.jonathanSnowblindness, "00:00:26"); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:32:09/08", vids.jonathanWelcome, "00:00:03.5"); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:32:11.5", vids.jonathanCrunch, "00:00:24.68", 150); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:32:47/10", vids.flattyHome, "00:00:17/22", 300); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:32:45", vids.flatty24Suns, "00:01:24.746", 50); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:32:49.6", vids.flattyEscape, "00:01:05/20", 300); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:32:55.4", vids.flattyFiguredItOut, "00:00:02/15", 10); // roundabout
timeline.addSyncPoint(vids.willSecond360, "00:35:44.7", vids.flattyIRThermometer, "00:00:30", 60); // roundabout

// (Solar events based on Stellarium.)
timeline.addEvent("10T22:02:28-03:00", "Sunset", "🌇");
timeline.addEvent("11T05:11:10-03:00", "Sunrise", "🌅");
timeline.addEvent("11T10:58:14-03:00", "Interviews with marathon group (35 min)", "🎤");
timeline.addEvent("11T22:03:32-03:00", "Sunset", "🌇");
timeline.addEvent("12T05:11:03-03:00", "Sunrise", "🌅");
timeline.addEvent("12T22:04:33-03:00", "Sunset", "🌇");
timeline.addEvent("13T05:11:00-03:00", "Sunrise", "🌅");
timeline.addEvent("13T22:05:31-03:00", "Sunset", "🌇");
timeline.addEvent("14T05:10:59-03:00", "Sunrise", "🌅");
timeline.addEvent("14T14:26:21.5-03:00", "Solar noon", "🌞");
timeline.addEvent(vids.mctoonDji14103903.videoToRealTime("01:00:29.335"), "Arrival at Union Glacier", "🛬");
timeline.addEvent("15T02:26:14.5-03:00", "Solar midnight", "🌄");
timeline.addEvent("15T14:26:48.5-03:00", "Solar noon", "🌞");
timeline.addEvent(vids.mctoonOakley.videoToRealTime("00:07:00"), '"Where is the guns Nathan?!"', "🗣️")
timeline.addEvent("16T02:26:45.5-03:00", "Solar midnight", "🌄");
timeline.addEvent(vids.willSecond360.videoToRealTime("00:08:12"), "22° halo around the Sun", "🔘");
timeline.addEvent("16T14:27:16.5-03:00", "Solar noon", "🌞");
timeline.addEvent(vids.willSecond360.videoToRealTime("00:19:47/29"), "Snowkiter", "🪂")
timeline.addEvent("17T02:27:16.5-03:00", "Solar midnight", "🌄");
timeline.addEvent("17T14:27:44.5-03:00", "Solar noon", "🌞");
timeline.addEvent(vids.criticalFlight3Tl.videoToRealTime("00:00:22/15"), "Departure from Union Glacier", "🛫");

// 13th 00:36-03 - trundle wheel measurement happened earlier
// 14th 14:33-03 - landing at UG
// 15th 03:12-03 - after MCToon's Live: trundle wheel
// 17th 11:06-00 - moving to the plane to leave Antarctica
