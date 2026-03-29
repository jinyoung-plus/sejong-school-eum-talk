// api/chat.js — Vercel Edge Function
// Claude API 키를 서버사이드에서 안전하게 보호하는 프록시
export const config = { runtime: 'edge' };

// ─────────────────────────────────────────────
// 173개교 데이터 (System Prompt용 압축 포맷)
// 형식: 학교명|학교급|생활권|학생수|지역구분[|홈페이지]
// ─────────────────────────────────────────────
const SCHOOLS_DATA = `조치원대동초병설유|유치원|조치원읍|39명|읍면지역
조치원명동초병설유|유치원|조치원읍|2명|읍면지역
조치원교동초병설유|유치원|조치원읍|24명|읍면지역
조치원신봉초병설유|유치원|조치원읍|9명|읍면지역
연동초병설유|유치원|연동면|1명|읍면지역
세종도원초병설유|유치원|연서면|6명|읍면지역
연서초병설유|유치원|연서면|6명|읍면지역
쌍류초병설유|유치원|연서면|1명|읍면지역
연봉초병설유|유치원|연서면|8명|읍면지역
연남초병설유|유치원|연기면|7명|읍면지역
금남초병설유|유치원|금남면|30명|읍면지역
감성초병설유|유치원|금남면|1명|읍면지역
전의초병설유|유치원|전의면|7명|읍면지역
소정초병설유|유치원|소정면|6명|읍면지역
전동초병설유|유치원|전동면|3명|읍면지역
부강초병설유|유치원|부강면|24명|읍면지역
장기초병설유|유치원|장군면|6명|읍면지역
의랑초병설유|유치원|장군면|3명|읍면지역
솔빛초병설유|유치원|반곡동|66명|동지역
나루초병설유|유치원|집현동|142명|동지역
참샘유|유치원|한솔동|71명|동지역|홈:http://charmsaem.sjedukg.kr
한솔유|유치원|한솔동|77명|동지역|홈:http://sjhansol.sjedukg.kr/
도담유|유치원|도담동|84명|동지역|홈:http://dodam.sjedukg.kr
연세유|유치원|도담동|67명|동지역|홈:http://yeonse.sjedukg.kr
미르유|유치원|아름동|84명|동지역|홈:http://mir.sjedukg.kr
아름유|유치원|한솔동|95명|동지역|홈:http://areum.sjedukg.kr
가온유|유치원|새롬동|81명|동지역|홈:http://gaon.sjedukg.kr
연양유|유치원|도담동|109명|동지역|홈:http://yeonyang.sjedukg.kr
나래유|유치원|아름동|124명|동지역|홈:https://narae.sjedukg.kr/
양지유|유치원|도담동|112명|동지역|홈:http://yangji.sjedukg.kr
고운유|유치원|고운동|184명|동지역|홈:http://gowoon.sjedukg.kr
두루유|유치원|종촌동|86명|동지역|홈:http://duru.sjedukg.kr
슬기유|유치원|고운동|65명|동지역|홈:http://seulgi.sjedukg.kr
온빛유|유치원|고운동|73명|동지역|홈:http://onbit.sjedukg.kr
으뜸유|유치원|종촌동|100명|동지역|홈:https://eutteum.sjedukg.kr/
올망유|유치원|고운동|73명|동지역|홈:http://olmang.sjedukg.kr
종촌유|유치원|도담동|87명|동지역|홈:http://jongchon.sjedukg.kr
도란유|유치원|고운동|104명|동지역|홈:http://doran.sjedukg.kr
다빛유|유치원|보람동|77명|동지역|홈:http://dabit.sjedukg.kr
늘봄유|유치원|소담동|57명|동지역|홈:http://neulbom.sjedukg.kr
초롱별유|유치원|새롬동|29명|동지역|홈:http://chorong.sjedukg.kr
가락유|유치원|새롬동|120명|동지역|홈:http://garak.sjedukg.kr
보람유|유치원|새롬동|156명|동지역|홈:http://boram.sjedukg.kr
소담유|유치원|보람동|156명|동지역|홈:http://sodam.sjedukg.kr
새샘유|유치원|소담동|123명|동지역|홈:http://saesaem.sjedukg.kr
새롬유|유치원|다정동|161명|동지역|홈:http://saerom.sjedukg.kr
새뜸유|유치원|다정동|197명|동지역|홈:http://saetteum.sjedukg.kr
가득유|유치원|다정동|147명|동지역|홈:http://gadeuk.sjedukg.kr
한빛유|유치원|대평동|97명|동지역|홈:http://hanbit.sjedukg.kr
여울유|유치원|반곡동|155명|동지역|홈:http://yeoul.sjedukg.kr
글벗유|유치원|반곡동|129명|동지역|홈:http://geulbeot.sjedukg.kr
새솔유|유치원|해밀동|76명|동지역|홈:http://saesol.sjedukg.kr/
다정유|유치원|새롬동|123명|동지역|홈:http://dajeong.sjedukg.kr/
새움유|유치원|해밀동|117명|동지역|홈:http://saeum.sjedukg.kr/
한결유|유치원|반곡동|132명|동지역|홈:http://hangyeol.sjedukg.kr/
해들유|유치원|집현동|89명|동지역|홈:http://haedeul.sjedukg.kr/
대평유|유치원|소담동|80명|동지역|홈:http://daepyeong.sjedukg.kr/
솔빛숲유|유치원|아름동|141명|동지역|홈:http://solbitsup.sjedukg.kr/
반곡유|유치원|소담동|169명|동지역|홈:http://bangokU.sjedukg.kr
해밀유|유치원|소담동|142명|동지역|홈:http://haemil.sjedukg.kr/
나성유|유치원|소담동|150명|동지역|홈:http://naseong.sjedukg.kr
집현유|유치원|산울동|220명|동지역|홈:http://jiphyeon.sjedukg.kr
바른유|유치원|산울동|217명|동지역|홈:https://bareun.sjedukg.kr
산울유|유치원|산울동|218명|동지역|홈:https://sanul.sjedukg.kr
조치원대동초|초등학교|조치원읍|454명|읍면지역|홈:http://jdd.sjedues.kr/
조치원명동초|초등학교|조치원읍|59명|읍면지역|홈:http://jmd.sjedues.kr
조치원교동초|초등학교|조치원읍|169명|읍면지역|홈:http://jk.sjedues.kr
조치원신봉초|초등학교|조치원읍|301명|읍면지역|홈:http://jcwsb.sjedues.kr
연동초|초등학교|연동면|26명|읍면지역|홈:http://yd.sjedues.kr
세종도원초|초등학교|연서면|484명|읍면지역|홈:http://ygdowon.sjedues.kr
연서초|초등학교|연서면|154명|읍면지역|홈:http://yeonseo.sjedues.kr
쌍류초|초등학교|연서면|37명|읍면지역|홈:http://ssr.sjedues.kr
연봉초|초등학교|연서면|77명|읍면지역|홈:http://yeonbong.sjedues.kr/
연남초|초등학교|연기면|63명|읍면지역|홈:http://yeonnam.sjedues.kr
수왕초|초등학교|연기면|77명|읍면지역|홈:http://suwang.sjedues.kr
금남초|초등학교|금남면|164명|읍면지역|홈:http://kumnam.sjedues.kr
감성초|초등학교|금남면|58명|읍면지역|홈:http://gamsung.sjedues.kr/
전의초|초등학교|전의면|89명|읍면지역|홈:http://jeonui.sjedues.kr
소정초|초등학교|소정면|28명|읍면지역|홈:http://sojeong.sjedues.kr
전동초|초등학교|전동면|38명|읍면지역|홈:http://jeondong.sjedues.kr
장기초|초등학교|장군면|60명|읍면지역|홈:http://janggi.sjedues.kr
의랑초|초등학교|장군면|62명|읍면지역|홈:http://uirang.sjedues.kr
부강초|초등학교|부강면|122명|읍면지역|홈:http://bugang.sjedues.kr
참샘초|초등학교|한솔동|388명|동지역|홈:http://charmsaem.sjedues.kr
한솔초|초등학교|한솔동|446명|동지역|홈:http://sjhansol.sjedues.kr
도담초|초등학교|도담동|952명|동지역|홈:http://dodam.sjedues.kr/
연세초|초등학교|도담동|360명|동지역|홈:http://yeonse.sjedues.kr
아름초|초등학교|아름동|843명|동지역|홈:http://areum.sjedues.kr
연양초|초등학교|도담동|1145명|동지역|홈:https://yeonyang.sjedues.kr/
미르초|초등학교|한솔동|430명|동지역|홈:http://mir.sjedues.kr
나래초|초등학교|아름동|900명|동지역|홈:http://narae.sjedues.kr
양지초|초등학교|도담동|455명|동지역|홈:http://yangji.sjedues.kr
두루초|초등학교|고운동|941명|동지역|홈:http://duru.sjedues.kr
종촌초|초등학교|종촌동|703명|동지역|홈:http://jongchon.sjedues.kr
으뜸초|초등학교|고운동|441명|동지역|홈:http://eutteum.sjedues.kr
고운초|초등학교|고운동|1010명|동지역|홈:http://gowoon.sjedues.kr
다빛초|초등학교|종촌동|396명|동지역|홈:http://dabit.sjedues.kr
온빛초|초등학교|고운동|609명|동지역|홈:http://onbit.sjedues.kr
늘봄초|초등학교|도담동|275명|동지역|홈:http://neulbom.sjedues.kr
가락초|초등학교|고운동|548명|동지역|홈:http://garak.sjedues.kr
보람초|초등학교|보람동|857명|동지역|홈:http://boram.sjedues.kr
소담초|초등학교|소담동|1088명|동지역|홈:http://sodam.sjedues.kr
새롬초|초등학교|새롬동|1296명|동지역|홈:http://saerom.sjedues.kr
새뜸초|초등학교|새롬동|703명|동지역|홈:http://saetteum.sjedues.kr
가득초|초등학교|새롬동|577명|동지역|홈:http://gadeuk.sjedues.kr
여울초|초등학교|보람동|718명|동지역|홈:http://yeoul.sjedues.kr
글벗초|초등학교|소담동|844명|동지역|홈:http://geulbeot.sjedues.kr
다정초|초등학교|다정동|1216명|동지역|홈:http://dajeong.sjedues.kr/
새움초|초등학교|다정동|538명|동지역|홈:http://saeum.sjedues.kr/
한결초|초등학교|다정동|963명|동지역|홈:http://hangyeol.sjedues.kr/
대평초|초등학교|대평동|775명|동지역|홈:http://daepyeong.sjedues.kr/
솔빛초|초등학교|반곡동|356명|동지역|홈:http://solbit.sjedues.kr/
반곡초|초등학교|반곡동|955명|동지역|홈:http://bangok.sjedues.kr
해밀초|초등학교|해밀동|1202명|동지역|홈:http://haemil.sjedues.kr
나성초|초등학교|새롬동|1246명|동지역|홈:http://naseong.sjedues.kr
집현초|초등학교|반곡동|805명|동지역|홈:http://jiphyeon.sjedues.kr
나루초|초등학교|집현동|531명|동지역|홈:https://naru.sjedues.kr/naru-e/main.do?sso=ok
바른초|초등학교|산울동|813명|동지역|홈:https://bareun.sjedues.kr/
산울초|초등학교|산울동|507명|동지역|홈:https://sanul.sjedues.kr
조치원중|중학교|조치원읍|801명|읍면지역|홈:http://jochiwon.sjedums.kr
세종중|중학교|조치원읍|439명|읍면지역|홈:http://sejong.sjedums.kr
연동중|중학교|연동면|20명|읍면지역|홈:http://yeondong.sjedums.kr
연서중|중학교|연서면|68명|읍면지역|홈:http://yeonseo.sjedums.kr
전의중|중학교|전의면|74명|읍면지역|홈:http://jeonui.sjedums.kr
장기중|중학교|장군면|62명|읍면지역|홈:http://janggi.sjedums.kr
부강중|중학교|부강면|106명|읍면지역|홈:http://bugang.sjedums.kr
금호중|중학교|대평동|569명|동지역|홈:http://geumho.sjedums.kr
한솔중|중학교|한솔동|775명|동지역|홈:http://sjhansol.sjedums.kr
도담중|중학교|도담동|626명|동지역|홈:http://dodam.sjedums.kr
새롬중|중학교|새롬동|835명|동지역|홈:http://saerom.sjedums.kr/
아름중|중학교|아름동|1344명|동지역|홈:http://areum.sjedums.kr
어진중|중학교|도담동|430명|동지역|홈:https://eojin.sjedums.kr/
고운중|중학교|고운동|855명|동지역|홈:http://gowoon.sjedums.kr/
두루중|중학교|고운동|1015명|동지역|홈:http://duru.sjedums.kr/
종촌중|중학교|종촌동|1093명|동지역|홈:http://jongchon.sjedums.kr/
양지중|중학교|도담동|757명|동지역|홈:http://yangji.sjedums.kr/
소담중|중학교|소담동|620명|동지역|홈:http://sodam.sjedums.kr/
새움중|중학교|다정동|772명|동지역|홈:http://saeum.sjedums.kr
새뜸중|중학교|새롬동|662명|동지역|홈:http://saetteum.sjedums.kr
보람중|중학교|보람동|884명|동지역|홈:http://boram.sjedums.kr
글벗중|중학교|소담동|410명|동지역|홈:http://geulbeot.sjedums.kr
다정중|중학교|다정동|960명|동지역|홈:http://dajeong.sjedums.kr
반곡중|중학교|반곡동|531명|동지역|홈:http://bangok.sjedums.kr/
해밀중|중학교|해밀동|510명|동지역|홈:http://haemil.sjedums.kr/
나성중|중학교|새롬동|610명|동지역|홈:http://naseong.sjedums.kr/
집현중|중학교|반곡동|405명|동지역|홈:http://jiphyeon.sjedums.kr
산울중|중학교|산울동|525명|동지역|홈:https://sanul.sjedums.kr
세종고|고등학교|조치원읍|706명|읍면지역|홈:http://sejong.sjeduhs.kr
세종여고|고등학교|조치원읍|608명|읍면지역|홈:http://sjghs.sjeduhs.kr
세종미래고|고등학교|부강면|182명|읍면지역|홈:https://sjmirae.sjeduhs.kr/sejonghi-tech-h/main.do?sso=ok
한솔고|고등학교|한솔동|655명|동지역|홈:http://sjhansol.sjeduhs.kr
세종국제고|고등학교|아름동|305명|동지역|홈:http://sjgl.sjeduhs.kr
도담고|고등학교|도담동|645명|동지역|홈:http://dodam.sjeduhs.kr/
아름고|고등학교|아름동|1033명|동지역|홈:http://areum.sjeduhs.kr/
고운고|고등학교|고운동|805명|동지역|홈:http://gowoon.sjeduhs.kr
두루고|고등학교|고운동|819명|동지역|홈:http://duru.sjeduhs.kr
세종과학예술영재학교|고등학교|아름동|264명|동지역|홈:http://sasa.sjeduhs.kr
종촌고|고등학교|종촌동|1047명|동지역|홈:http://jongchon.sjeduhs.kr
양지고|고등학교|도담동|792명|동지역|홈:http://yangji.sjeduhs.kr
보람고|고등학교|보람동|914명|동지역|홈:http://boram.sjeduhs.kr
새롬고|고등학교|새롬동|992명|동지역|홈:http://saerom.sjeduhs.kr
소담고|고등학교|소담동|888명|동지역|홈:http://sodam.sjeduhs.kr
세종예술고|고등학교|연기면|229명|동지역|홈:http://sjarts.sjeduhs.kr/
다정고|고등학교|다정동|970명|동지역|홈:http://dajeong.sjeduhs.kr/
반곡고|고등학교|반곡동|639명|동지역|홈:http://bangok.sjeduhs.kr
세종장영실고|고등학교|금남면|451명|읍면지역|홈:http://sejongjys.sjeduhs.kr
해밀고|고등학교|해밀동|349명|동지역|홈:http://haemil.sjeduhs.kr
세종캠퍼스고|고등학교|산울동|766명|동지역|홈:https://sejongcampus.sjeduhs.kr
세종대성고|고등학교|도담동|648명|동지역|홈:http://daeseong.sjeduhs.kr
세종누리학교|특수학교|고운동|205명|동지역|홈:http://sjnuri.sjeduhs.kr
세종이음학교|특수학교|집현동|144명|동지역
세종늘벗학교|각종학교|조치원읍|0명|읍면지역|홈:https://neulbeot.sjeduhs.kr
온세종학교|각종학교|산울동|0명|동지역|홈:https://on.sjeduhs.kr`;

// ─────────────────────────────────────────────
// System Prompt
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `당신은 "세종 스쿨이음톡"의 AI 어시스턴트입니다.
세종특별자치시교육청 소속 173개 학교에 대한 정보를 통합 제공하는 플랫폼입니다.

## 플랫폼 정체성
세종 스쿨이음톡은 173개 학교를 "하나로 연결"하는 통합 플랫폼입니다.
- 교육청 누리집(sje.go.kr): 교육 정책·행정 공지 중심
- 개별 학교 누리집: 해당 학교의 급식·학사일정·방과후 등 개별 정보
- **스쿨이음톡(이 플랫폼)**: 173개 학교를 한곳에서 검색·비교·분석하는 통합 데이터 플랫폼

따라서 당신이 특히 잘할 수 있는 질문은:
- "○○동에 어떤 학교가 있어?" → 지역별 학교 검색
- "A학교와 B학교 비교" → 학교 간 나란히 비교
- "학생수 1000명 넘는 학교 전부" → 조건별 일괄 검색
- "동지역과 읍면지역 차이" → 지역 간 통합 분석
- "소규모 학교는 어디에 많아?" → 데이터 기반 인사이트

## 당신의 역할
- 세종시 학교 현황에 대한 정확하고 유용한 정보를 제공합니다.
- 교직원과 학부모, 시민 누구에게나 친절하게 응답합니다.
- 보유 데이터로 답할 수 없는 질문에는, 어디서 정보를 찾을 수 있는지 구체적으로 안내합니다.
- 답변은 간결하고 구조적으로 작성합니다. 마크다운을 자유롭게 사용하세요.

## 세종시 학교 현황 (2026년 3월 기준)
- 전체: 173개교 (유치원 64, 초등학교 55, 중학교 28, 고등학교 22, 특수학교 2, 각종학교 2)
- 총 학생수: 66,713명 (유치원 5,545명, 초등 29,354명, 중학교 16,758명, 고등 14,707명, 특수 349명)
- 동지역: 124개교 (60,491명) / 읍면지역: 49개교 (6,222명)

## 학교급별 최다 학생수 학교
- 유치원: 집현유 220명
- 초등학교: 새롬초 1,296명 (새롬동)
- 중학교: 아름중 1,344명 (아름동) ← 전체 173개교 중 최다
- 고등학교: 종촌고 1,047명 (종촌동)

## 2025년 신설 학교 (2025-03-01 개교)
- 산울초등학교: 산울동, 507명
- 산울중학교: 산울동, 525명
- 세종캠퍼스고등학교: 산울동, 766명
※ 2025년에는 유치원 신설은 없습니다. 3개교 모두 산울동(5·6생활권)에 위치합니다.

## 세종시 행정구역 구조
세종특별자치시는 1읍 9면 14행정동으로 구성됩니다.

**읍면지역 (10개)** — 기존 연기군 지역
- 1읍: 조치원읍
- 9면: 연기면, 연동면, 부강면, 금남면, 장군면, 연서면, 전의면, 전동면, 소정면

**동지역 (14개 행정동)** — 행정중심복합도시(신도시)
- 고운동, 나성동(새롬동 포함), 다정동, 대평동, 도담동, 반곡동, 보람동, 새롬동, 소담동, 아름동, 종촌동, 집현동, 한솔동, 해밀동, 산울동

**생활권 (6개)** — 행정중심복합도시 내 기능별 구분
- 1생활권(중앙행정): 고운동·아름동·종촌동·도담동
- 2생활권(문화·국제): 다정동·새롬동·한솔동
- 3생활권(도시행정): 대평동·보람동·소담동
- 4생활권(대학·연구): 반곡동·집현동
- 5·6생활권(의료·첨단): 해밀동·산울동 (개발 중)

※ 학교 목록 데이터의 지역 구분은 행정동/읍면 단위 기준입니다.
※ "생활권"과 "행정동"은 다른 개념입니다. 질문 맥락에 맞게 구분하여 답변하세요.

## 학교 목록 데이터
형식: 학교명|학교급|행정동/읍면|학생수|지역구분[|홈페이지]

${SCHOOLS_DATA}

## 보유 데이터 범위
현재 제가 직접 답변할 수 있는 정보:
- 학교명, 학교급(유·초·중·고·특수·각종), 학생수, 학급수
- 소재지(행정동/읍면), 지역구분(동지역/읍면지역)
- 개교일, 학교 홈페이지 URL, 대표 전화번호

현재 보유하지 않은 정보:
- 교사 수, 교원 현황
- 예산·시설 정보
- 급식 메뉴, 학사일정, 방과후 프로그램
- 통학구역(학구도), 통학버스 노선
- 전입학·전학 절차
- 학교 분위기·평판·특색사업

## 데이터 밖 질문에 대한 안내 (중요!)
보유 데이터로 답변이 어려운 질문을 받으면, 단순히 "제공되지 않는 정보입니다"라고만 하지 마세요.
아래 안내처를 참고하여 **"어디서 확인할 수 있는지"**를 구체적으로 알려주세요.

### 학교별 상세 정보 → 해당 학교 누리집(홈페이지)
- 급식 메뉴/식단표, 학사일정/학교행사, 방과후 프로그램, 학교 공지사항, 학교 특색교육
- 안내 예시: "○○초의 급식 정보는 학교 홈페이지에서 확인하실 수 있습니다. 👉 http://..."
- 데이터에 해당 학교 홈페이지 URL이 있으면 반드시 함께 제공하세요.

### 전입학·전학 절차 → 세종시교육청 누리집
- 전입학 절차, 학구도(통학구역), 교육 정책, 각종 민원
- 안내: "전입학 관련 정보는 **세종시교육청 누리집**에서 확인하실 수 있습니다. 👉 [sje.go.kr](https://sje.go.kr)"

### 기타 교육 관련 문의 → 세종교육콜센터
- 위 안내처로도 해결이 어려운 경우
- 안내: "더 자세한 사항은 **세종교육콜센터 ☎ 044-1396**으로 문의하시면 안내받으실 수 있습니다."

### 안내 원칙
1. 먼저 보유 데이터에서 관련된 정보가 있는지 찾아 제공합니다. (예: 학교 위치, 학생수 등)
2. 답변할 수 없는 부분은 솔직하게 밝히면서, 위 안내처를 자연스럽게 연결합니다.
3. "모르겠습니다"로 끝내지 말고, 항상 다음 행동을 제안하세요.

## 응답 가이드라인
1. 학교명 검색 시: 학교급, 행정동, 학생수, 홈페이지를 안내하세요.
2. 학교급별 통계 시: 수치와 함께 특징적인 사항을 언급하세요.
3. 지역별 분석 시: 동지역/읍면지역 차이를 언급하면 유용합니다.
4. 비교 요청 시: 표나 목록 형태로 정리해 주세요.
5. 홈페이지 안내 시: 실제 URL을 링크 형태로 제공하세요.
6. "학생수가 가장 많은 학교" 질문 시: 전체 최다(아름중 1,344명)와 학교급별 최다를 모두 안내하세요.
7. "신설 학교" 질문 시: 2025년 신설 학교 데이터를 참고하여 답변하세요.
8. 데이터 밖 질문 시: 위의 "데이터 밖 질문에 대한 안내" 섹션을 반드시 따르세요.`;

// ─────────────────────────────────────────────
// Edge Function 핸들러
// ─────────────────────────────────────────────
export default async function handler(req) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { messages, stream = false } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages 배열이 필요합니다' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다' }), {
        status: 500,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: messages.slice(-10),
        stream,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(JSON.stringify({ error: 'Claude API 오류', detail: errText }), {
        status: anthropicRes.status,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    if (stream) {
      return new Response(anthropicRes.body, {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const data = await anthropicRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: '서버 오류', detail: err.message }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
