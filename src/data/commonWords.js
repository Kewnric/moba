// Everyday words that are never a guess at a hero's name, so normal talk near the mic doesn't fill slots. Real
// hero names and known mishearings are matched before this list is looked at, so they still work.
const WORDS = `
a able about above across act actually add after again against ago agree ah ahead air all almost alone along already
also always am among an and angry another answer any anyone anything anyway are area arm around as ask at away awesome
baby back bad bag ball ban bank bans base be beat beautiful because become bed been before begin behind being believe
best better between big bit black blue board body book boring both bottom box boy break bring brother brown build
bus busy but buy by call came camera can car card care carry case cat catch cause chance check child children city
class clean clear close cold color come company could couple course cover crazy cut dad damn dark day dead deal dear
decide delete did die different dinner do doctor does dog doing done door double down dream drink drive drop during
each ear early earth easy eat else end enemy enemies enough even ever every everyone everything exactly eye face fact
fall family far farm fast father feed feel few fight fill final find fine finish fire first fish five floor fly follow
food foot for forget found four free friend from front full fun game gave get girl give glad go god going gold gone
good got great green ground group grow guess guy guys had hair half hand hang happen happy hard has hate have he head
hear heard heart heavy hello help her here hey hi high him his hit hold home hope hot hour house how huge hundred
hurt i idea if ill important in inside instead into is it its job join just keep kept kid kill kind knew know
lady land lane large last late later laugh lead learn least leave left less lesson let lets level lie life light
like line list listen little live long look lord lose lost lot loud love low lucky mad made main make man many map
mark match matter may maybe me mean meet men mid might mind mine minute miss mistake mom moment money month more
morning most mother mouth move movie much music must my name near need never new next nice night nine no none nope
not note nothing now number of off often oh ok okay old on once one only open or order other our out outside over own
page paper park part party pass past pay people perfect person phone pick picture piece place plan play please point
poor power press pretty problem pull push put quick quiet quite rain ran rather reach read ready real really red
remember remove rest right ring river road rock room round run sad safe said same sat save saw say school score second
see seem seen send sense set seven several shall she short should show shut sick side sign silly since sing sir sister
sit six skill sleep slow small smart so some someone something sometimes son soon sorry sort sound speak special spend
stand start stay step still stop store story street strong stuff stupid such sure take talk tall tank tea team tell ten
than thank thanks that the their them then there these they thing think third this those though thought three through
time tired to today together told tomorrow tonight too took top touch tower town tree tried trip true trust try turn
turtle two under understand until up us use used very wait walk wall want war was watch water way we wear week well
went were what when where which while white who whole why wife will win wind window wish with without woman won
wonder word work world worry worse would wow write wrong yeah year yep yes yet you young your yourself
table valley bottle water sister mister master doctor better letter matter dinner winner summer
ally allies arrow assist attack blink boots bot buff bush damage dash delay dodge erase farming flicker
gank ganking gg healer invade jungle jungler jungling lock locked lag lagging lifesteal mage marksman meta minion
minions mythic nerf noob objective opponent pro rank ranked retri retribution roam roamer sniper spell stun support
teammate ult ultimate undo
bro dude gosh hmm huh lol mhm oops uh um wait whoa yay
batman superman michael kenneth robert maria carlos pedro juan john james david manila cebu davao laptop keyboard
monitor headset headphones mobile legends charger chicken burger coffee pizza banana orange apple mango breakfast lunch
teacher student office meeting message internet network server loading victory defeat savage maniac triple assassin
fighter mountain ocean forest kitchen bathroom bedroom weather holiday birthday computer sorry please thank
ano ayan bakit dito doon hindi idol kasi lods naman oo opo pare par pre sige tara tama wala yung
`;

export const COMMON_WORDS = new Set(WORDS.trim().split(/\s+/));
