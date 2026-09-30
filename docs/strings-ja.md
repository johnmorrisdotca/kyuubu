# Kyuubu's words, in English and Japanese

Made from `src/words.ts` and `src/strings.ts` by `pnpm docs:make`; a test fails if the two differ, so this list is never out of date.

**The Japanese has not yet been reviewed by a native reader.** If a line reads wrongly or unnaturally, please
open a *Fix a translation* issue with the string's name. `{n}` and the other braces are filled in when shown.

| Name | English | Japanese |
| --- | --- | --- |
| `cubeLabel` | A {n}×{n} cube | {n}×{n}のキューブ |
| `solved` | Solved | 完成 |
| `notSolved` | Not solved | 未完成 |
| `stageHold` | Hold it | 持ち方 |
| `stageWhiteCross` | White cross | 白のクロス |
| `stageWhiteCorners` | White corners | 白のコーナー |
| `stageWhiteLayer` | White layer | 白の面 |
| `stageMiddleLayer` | Middle layer | 二段目 |
| `stageYellowCross` | Yellow cross | 黄色のクロス |
| `stageYellowFace` | Yellow face | 黄色の面 |
| `stageYellowCorners` | Yellow corners | 黄色のコーナー |
| `stageYellowEdges` | Yellow edges | 黄色のエッジ |
| `saysHold` | Turn the whole cube so that white is on the bottom. | キューブ全体を回して、白を下にします。 |
| `saysWhiteCross` | Put a white edge in its place on the bottom, with its other colour matching the side. | 白のエッジを下の面の正しい位置に入れ、もう一方の色を側面に合わせます。 |
| `saysWhiteCorners` | Put a white corner in its place on the bottom, between the edges of the cross. | 白のコーナーを、下の面のクロスのエッジの間に入れます。 |
| `saysWhiteLayer` | Put a white corner in its place on the bottom. | 白のコーナーを下の面の正しい位置に入れます。 |
| `saysMiddleLayer` | Drop an edge from the top into its place in the middle layer. | 上の面のエッジを二段目の正しい位置に入れます。 |
| `saysYellowCross` | Make a yellow cross on the top. | 上の面に黄色のクロスを作ります。 |
| `saysYellowFace` | Turn the whole top yellow. | 上の面をすべて黄色にします。 |
| `saysYellowCorners` | Move the top corners to their own places. | 上の面のコーナーを正しい位置に動かします。 |
| `saysYellowEdges` | Move the top edges to their own places, and the cube is solved. | 上の面のエッジを正しい位置に動かすと、キューブの完成です。 |
| `algCornerIn` | Corner in | コーナーを入れる |
| `algEdgeRight` | Edge in, to the right | エッジを右に入れる |
| `algEdgeLeft` | Edge in, to the left | エッジを左に入れる |
| `algYellowCross` | Yellow cross | 黄色のクロス |
| `algSune` | Sune | Sune |
| `algCornerCycle` | Three corners round | コーナーの三点交換 |
| `algEdgeCycle` | Three edges round | エッジの三点交換 |
| `playerPlay` | Play | 再生 |
| `playerPause` | Pause | 一時停止 |
| `playerBack` | Back | 戻る |
| `playerOn` | Forward | 進む |
| `playerAgain` | To the scramble | スクランブルに戻す |
| `playerLoop` | Repeat | くり返す |
| `playerSpeed` | Speed | 速さ |
| `playerOwnPace` | Real speed | 実際の速さ |
| `playerMoveOf` | Move {at} of {total} | {total}手中{at}手目 |
| `playerScrub` | Where in the solve | ソルブの位置 |
| `playerUnsolved` | These moves do not end on a solved cube. | この手順ではキューブはそろいません。 |
| `playerCannotRead` | “{token}” is not a move (line {line}, place {column}). | 「{token}」は回転記号ではありません（{line}行目、{column}文字目）。 |
| `playerNoSuchLayer` | “{token}” turns a layer this cube does not have (line {line}, place {column}). | 「{token}」はこのキューブにない層を回します（{line}行目、{column}文字目）。 |
| `playerTooLong` | That is too long to play. | 長すぎて再生できません。 |
| `playerEvenPace` | The solve took {time} seconds. Its moves are spread evenly over that time here; the real solve was not this even. | このソルブのタイムは{time}秒です。ここでは各手をその時間に均等に割り振っています。実際のソルブはこれほど均等ではありません。 |
| `playerCredit` | Kyuubu | Kyuubu |
| `guideSideR` | right | 右 |
| `guideSideL` | left | 左 |
| `guideSideU` | top | 上 |
| `guideSideD` | bottom | 下 |
| `guideSideF` | front | 前 |
| `guideSideB` | back | 後ろ |
| `guideFace` | the {side} face | {side}の面 |
| `guideInner` | layer {depth} in from the {side} | {side}から{depth}番目の層 |
| `guideWide` | the {count} layers on the {side} | {side}側の{count}層 |
| `guideMiddleM` | the middle layer between left and right | 左右の間の中央の層 |
| `guideMiddleE` | the middle layer between top and bottom | 上下の間の中央の層 |
| `guideMiddleS` | the middle layer between front and back | 前後の間の中央の層 |
| `guideTowards` | towards you | 手前に |
| `guideAway` | away from you | 奥に |
| `guideToRight` | to the right | 右に |
| `guideToLeft` | to the left | 左に |
| `guideClockwise` | clockwise, as you look at the front | 正面から見て時計回りに |
| `guideAnticlockwise` | anticlockwise, as you look at the front | 正面から見て反時計回りに |
| `guideTurn` | Turn {layers} {way}. | {layers}を{way}回します。 |
| `guideHalf` | Turn {layers} half way round. | {layers}を半回転させます。 |
| `guideWholeX` | Turn the whole cube so that the front goes to the top. | キューブ全体を回して、前の面を上にします。 |
| `guideWholeXPrime` | Turn the whole cube so that the front goes to the bottom. | キューブ全体を回して、前の面を下にします。 |
| `guideWholeX2` | Turn the whole cube upside down, rolling it forwards. | キューブ全体を前に転がして、上下を逆にします。 |
| `guideWholeY` | Turn the whole cube so that the front goes to the left. | キューブ全体を回して、前の面を左にします。 |
| `guideWholeYPrime` | Turn the whole cube so that the front goes to the right. | キューブ全体を回して、前の面を右にします。 |
| `guideWholeY2` | Turn the whole cube round, so that the back comes to the front. | キューブ全体を回して、後ろの面を前にします。 |
| `guideWholeZ` | Turn the whole cube so that the top goes to the right. | キューブ全体を回して、上の面を右にします。 |
| `guideWholeZPrime` | Turn the whole cube so that the top goes to the left. | キューブ全体を回して、上の面を左にします。 |
| `guideWholeZ2` | Turn the whole cube upside down, rolling it sideways. | キューブ全体を横に転がして、上下を逆にします。 |
| `guideDrag` | Take hold of the sticker with the dot, and drag it along the arrow. | 点のあるステッカーを持って、矢印に沿ってドラッグします。 |
| `guideDragHalf` | A half turn: drag twice as far, or make two quarter turns the same way. | 半回転です。2倍の距離をドラッグするか、同じ向きに2回回します。 |
| `guideDragSlab` | {count} layers turn together: drag each of them along the arrow. | {count}つの層を一緒に回します。それぞれを矢印に沿ってドラッグします。 |
| `guideLook` | Drag beside the cube to look round it, until you can see a side of the lit layer. | キューブの外側をドラッグして、光っている層の側面が見えるまで見る向きを変えます。 |
| `guideWholeHow` | No drag on a sticker does this: press {key}, or choose “{button}”. | ステッカーのドラッグではできません。{key}を押すか、「{button}」を選びます。 |
| `guideOff` | You turned {made}, not {wanted}. | {wanted}ではなく{made}を回しました。 |
| `guideOffHow` | Take it back to carry on from where you were, or turn it back yourself. | 取り消して元の位置から続けるか、自分で回して戻します。 |
| `guideTakeBack` | Take it back | 取り消す |
| `guideDoIt` | Turn it for me | 代わりに回す |
| `guideDone` | That was the last move. | これが最後の手でした。 |
| `guideLabel` | What to turn next | 次に回す手 |
| `playerFollow` | Turn it yourself | 自分で回す |
| `cliUsage` | Usage: kyuubu [options] [turns]<br><br>A turning cube from the command line: scrambles, turns, a check and a solve.<br>Turns are written in cubers' notation. Quote them, since a shell reads the ' itself.<br><br>  kyuubu                                   a scramble for the 3×3<br>  kyuubu -n 4 -c 5                         five scrambles for the 4×4<br>  kyuubu --seed "club night"               the same scramble for everyone with the seed<br>  kyuubu --apply "R U R' U'"               the cube after those turns<br>  kyuubu --verify --from "R U" "U' R'"     whether the turns solve the scramble<br>  kyuubu --solve "R U2 F' L"               the layer-by-layer solve of that scramble<br><br>What to do:<br>      --scramble        Print a scramble. This is what happens when nothing else is asked<br>      --apply           Make the turns and show the cube<br>      --verify          Say whether the turns solve the cube: exit code 0 if they do, 1 if not<br>      --solve           Show the layer-by-layer solve, step by step (2×2 and 3×3)<br><br>Options:<br>  -n, --size <n>        The cube's side, 2 to 7. 3 when left out<br>  -l, --length <n>      How many turns a scramble has. The usual length for the size when left out<br>  -c, --count <n>       How many scrambles, 1 to 100<br>  -s, --seed <seed>     The same seed gives the same scrambles, everywhere<br>      --faces           Scramble with the outer faces only: no inner layers<br>  -f, --from <turns>    The scramble the cube starts from<br>      --state <state>   The cube to start from, as its 6 × n × n letters<br>      --stdin           Read the turns from standard input<br>  -j, --json            Print JSON<br>      --lang <en\|ja>    English or Japanese<br>      --no-color        No colour<br>  -h, --help            This help<br>  -v, --version         The version<br> | 使い方: kyuubu [オプション] [回転記号]<br><br>コマンドラインで回すキューブです。スクランブル、回転、確認、解き方を扱います。<br>回転は回転記号で書きます。シェルが ' を読んでしまうので、引用符で囲んでください。<br><br>  kyuubu                                   3×3のスクランブル<br>  kyuubu -n 4 -c 5                         4×4のスクランブルを5個<br>  kyuubu --seed "club night"               同じシードなら、だれでも同じスクランブル<br>  kyuubu --apply "R U R' U'"               その回転のあとのキューブ<br>  kyuubu --verify --from "R U" "U' R'"     その回転でスクランブルがそろうかどうか<br>  kyuubu --solve "R U2 F' L"               そのスクランブルを一段ずつそろえる手順<br><br>すること:<br>      --scramble        スクランブルを表示します（何も指定しないときの動作）<br>      --apply           回転を行い、キューブを表示します<br>      --verify          回転でキューブがそろうかを答えます。そろえば終了コード0、そろわなければ1<br>      --solve           一段ずつそろえる手順を表示します（2×2と3×3）<br><br>オプション:<br>  -n, --size <n>        キューブの大きさ（2〜7）。省略時は3<br>  -l, --length <n>      スクランブルの手数。省略時はその大きさの標準の手数<br>  -c, --count <n>       スクランブルの個数（1〜100）<br>  -s, --seed <seed>     同じシードなら、どこでも同じスクランブル<br>      --faces           外側の面だけでスクランブルします（内側の層は回しません）<br>  -f, --from <回転>     はじめのスクランブル<br>      --state <状態>    はじめのキューブの状態（6 × n × n 文字）<br>      --stdin           回転を標準入力から読みます<br>  -j, --json            JSONで表示します<br>      --lang <en\|ja>    英語または日本語<br>      --no-color        色を付けません<br>  -h, --help            このヘルプ<br>  -v, --version         バージョン<br> |
| `cliBadOption` | unknown option {option} | 不明なオプションです: {option} |
| `cliNeedsValue` | {option} needs a value | {option} には値が必要です |
| `cliOneMode` | choose one of --scramble, --apply, --verify and --solve | --scramble、--apply、--verify、--solve のうち1つを選んでください |
| `cliBadSize` | “{value}”: a cube is 2 to 7 on a side | 「{value}」: キューブの大きさは2〜7です |
| `cliBadLength` | “{value}”: a scramble is 1 to 1000 turns | 「{value}」: スクランブルは1〜1000手です |
| `cliBadCount` | “{value}”: 1 to 100 scrambles at a time | 「{value}」: 一度に作れるスクランブルは1〜100個です |
| `cliBadLang` | “{value}”: the languages are en and ja | 「{value}」: 言語は en か ja です |
| `cliBadMoves` | “{part}” is not a turn a {n}×{n} cube can make | 「{part}」は{n}×{n}のキューブでは回せません |
| `cliBadState` | that is not a {n}×{n} cube: it takes {count} letters, {each} each of U, R, F, D, L and B | {n}×{n}のキューブの状態ではありません。U・R・F・D・L・B を{each}個ずつ、合わせて{count}文字が必要です |
| `cliNoMethod` | the step-by-step solve is for the 2×2 and the 3×3 | 手順を表示できるのは2×2と3×3だけです |
| `cliImpossible` | this cube cannot be solved by turning it: a piece has been twisted or swapped | このキューブは回すだけではそろいません。パーツがねじれているか、入れ替わっています |
| `cliNeedsStart` | --verify needs the cube it starts from: --from "<scramble>" or --state <state> | --verify には、はじめのキューブが必要です: --from "<スクランブル>" または --state <状態> |
| `cliSolvedIn` | Solved. Moves: {count} | 完成。手数: {count} |
| `cliNotSolvedAfter` | Not solved. Moves: {count} | 未完成。手数: {count} |
| `cliAlreadySolved` | Already solved | すでに完成しています |
| `cliSteps` | Steps: {steps}. Moves: {count} | ステップ数: {steps}、手数: {count} |
| `cliState` | state | 状態 |
