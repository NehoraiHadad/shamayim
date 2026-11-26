## Cloud cover against the satellite mask

Mean absolute error in percentage points of cover (bias; false cloudy / missed cloudy at 30 %). Seven sites (verify_cloud.py), 30 km box of the MSG cloud mask, every second day at 05/08/11/14/18 UTC.

### 2024-2025 (held out)

**l0 where the removal changes >= 1 pp** (n = 2,624): ICON alone 30.8 (+24.0; 1526/48); ECMWF alone 19.9 (-18.8; 0/698); old blend (ICON 0.6) 21.5 (+6.9; 596/294); app blend (ICON 0.4) 19.0 (-1.7; 89/545); app + isolated-low removal (b4432a3) 19.2 (-15.8; 20/657); app + ground calibration (half, next 3 h) 19.1 (+0.3; 222/440); app + both (b4432a3 order) 18.6 (-13.5; 50/607)

**l0** (n = 11,977): ICON alone 19.5 (+7.2; 2596/600); ECMWF alone 18.8 (-14.4; 345/2265); old blend (ICON 0.6) 17.0 (-1.4; 1473/920); app blend (ICON 0.4) 16.8 (-5.8; 813/1307); app + isolated-low removal (b4432a3) 16.8 (-8.9; 743/1421); app + ground calibration (half, next 3 h) 16.7 (-5.0; 1009/1129); app + both (b4432a3 order) 16.6 (-8.0; 836/1296)

**l0 day** (n = 9,583): ICON alone 20.1 (+6.3; 2078/541); ECMWF alone 20.4 (-16.4; 252/2004); old blend (ICON 0.6) 17.8 (-2.8; 1140/834); app blend (ICON 0.4) 17.7 (-7.3; 642/1194); app + isolated-low removal (b4432a3) 18.2 (-10.6; 583/1298); app + ground calibration (half, next 3 h) 17.7 (-6.2; 823/1019); app + both (b4432a3 order) 17.9 (-9.4; 664/1177)

**l0 night** (n = 2,394): ICON alone 17.0 (+11.0; 518/59); ECMWF alone 12.5 (-6.7; 93/261); old blend (ICON 0.6) 13.8 (+4.0; 333/86); app blend (ICON 0.4) 12.9 (+0.4; 171/113); app + isolated-low removal (b4432a3) 11.3 (-2.0; 160/123); app + ground calibration (half, next 3 h) 12.9 (+0.0; 186/110); app + both (b4432a3 order) 11.4 (-2.2; 172/119)

**l1** (n = 12,152): ICON alone 21.4 (+9.3; 2902/603); ECMWF alone 19.1 (-13.8; 441/2222); old blend (ICON 0.6) 18.3 (+0.1; 1791/915); app blend (ICON 0.4) 17.7 (-4.5; 1053/1304)

**l1 day** (n = 9,723): ICON alone 21.8 (+8.2; 2302/532); ECMWF alone 20.6 (-15.6; 332/1965); old blend (ICON 0.6) 18.9 (-1.3; 1378/819); app blend (ICON 0.4) 18.6 (-6.1; 832/1182)

**l1 night** (n = 2,429): ICON alone 19.8 (+13.7; 600/71); ECMWF alone 12.9 (-6.4; 109/257); old blend (ICON 0.6) 15.8 (+5.6; 413/96); app blend (ICON 0.4) 14.4 (+1.6; 221/122)

**l2** (n = 12,117): ICON alone 21.6 (+8.5; 2877/686); ECMWF alone 19.5 (-13.8; 473/2266); old blend (ICON 0.6) 18.6 (-0.4; 1799/979); app blend (ICON 0.4) 18.0 (-4.9; 1039/1357)

**l2 day** (n = 9,695): ICON alone 22.0 (+7.3; 2285/600); ECMWF alone 21.1 (-15.8; 353/2003); old blend (ICON 0.6) 19.2 (-1.9; 1397/880); app blend (ICON 0.4) 18.9 (-6.5; 801/1233)

**l2 night** (n = 2,422): ICON alone 20.2 (+13.1; 592/86); ECMWF alone 13.2 (-5.9; 120/263); old blend (ICON 0.6) 16.1 (+5.5; 402/99); app blend (ICON 0.4) 14.6 (+1.7; 238/124)

**l4** (n = 12,082): ICON alone 23.1 (+7.9; 2954/783); ECMWF alone 20.7 (-14.3; 517/2394); old blend (ICON 0.6) 20.1 (-1.0; 1818/1155); app blend (ICON 0.4) 19.6 (-5.5; 1081/1573)

**l4 day** (n = 9,667): ICON alone 23.2 (+6.4; 2313/674); ECMWF alone 22.4 (-16.3; 404/2111); old blend (ICON 0.6) 20.7 (-2.7; 1370/1029); app blend (ICON 0.4) 20.4 (-7.2; 826/1416)

**l4 night** (n = 2,415): ICON alone 22.5 (+13.7; 641/109); ECMWF alone 14.0 (-6.6; 113/283); old blend (ICON 0.6) 17.8 (+5.6; 448/126); app blend (ICON 0.4) 16.1 (+1.5; 255/157)

**l6** (n = 12,047): ICON alone 26.5 (+5.5; 3100/1157); ECMWF alone 23.0 (-15.6; 608/2745); old blend (ICON 0.6) 22.4 (-7.2; 1222/1987); app blend (ICON 0.4) 22.4 (-7.2; 1222/1987)

**l6 day** (n = 9,639): ICON alone 26.5 (+3.6; 2383/995); ECMWF alone 24.7 (-17.6; 468/2419); old blend (ICON 0.6) 23.2 (-9.1; 939/1762); app blend (ICON 0.4) 23.2 (-9.1; 939/1762)

**l6 night** (n = 2,408): ICON alone 26.5 (+13.2; 717/162); ECMWF alone 16.2 (-7.4; 140/326); old blend (ICON 0.6) 19.1 (+0.8; 283/225); app blend (ICON 0.4) 19.1 (+0.8; 283/225)

### 2026 (in-sample for the cloud fits)

**l0 where the removal changes >= 1 pp** (n = 833): ICON alone 31.5 (+28.3; 547/9); ECMWF alone 12.6 (-9.3; 0/133); old blend (ICON 0.6) 20.2 (+13.2; 202/59); app blend (ICON 0.4) 16.2 (+5.7; 25/115); app + isolated-low removal (b4432a3) 13.1 (-5.8; 4/127); app + ground calibration (half, next 3 h) 17.1 (+7.8; 69/91); app + both (b4432a3 order) 13.4 (-3.6; 18/114)

**l0** (n = 5,635): ICON alone 19.7 (+8.3; 1300/245); ECMWF alone 15.2 (-4.6; 389/623); old blend (ICON 0.6) 16.4 (+3.1; 874/296); app blend (ICON 0.4) 15.4 (+0.5; 620/399); app + isolated-low removal (b4432a3) 14.9 (-1.2; 599/411); app + ground calibration (half, next 3 h) 16.0 (+0.9; 725/332); app + both (b4432a3 order) 15.4 (-0.8; 673/355)

**l0 day** (n = 4,508): ICON alone 19.9 (+7.1; 1018/215); ECMWF alone 16.6 (-5.8; 331/563); old blend (ICON 0.6) 16.9 (+1.9; 679/264); app blend (ICON 0.4) 16.1 (-0.7; 513/363); app + isolated-low removal (b4432a3) 15.9 (-2.4; 499/372); app + ground calibration (half, next 3 h) 16.7 (+0.0; 610/297); app + both (b4432a3 order) 16.4 (-1.6; 566/318)

**l0 night** (n = 1,127): ICON alone 19.0 (+13.1; 282/30); ECMWF alone 9.4 (+0.3; 58/60); old blend (ICON 0.6) 14.5 (+7.9; 195/32); app blend (ICON 0.4) 12.5 (+5.4; 107/36); app + isolated-low removal (b4432a3) 10.9 (+3.5; 100/39); app + ground calibration (half, next 3 h) 13.1 (+4.4; 115/35); app + both (b4432a3 order) 11.5 (+2.5; 107/37)

**l1** (n = 5,635): ICON alone 22.2 (+10.3; 1468/275); ECMWF alone 16.9 (-3.8; 496/634); old blend (ICON 0.6) 18.5 (+4.7; 1024/310); app blend (ICON 0.4) 17.4 (+1.8; 769/398)

**l1 day** (n = 4,508): ICON alone 22.4 (+9.0; 1143/246); ECMWF alone 18.2 (-5.3; 405/576); old blend (ICON 0.6) 19.0 (+3.3; 792/281); app blend (ICON 0.4) 18.1 (+0.4; 616/366)

**l1 night** (n = 1,127): ICON alone 21.6 (+15.7; 325/29); ECMWF alone 11.9 (+2.2; 91/58); old blend (ICON 0.6) 16.8 (+10.3; 232/29); app blend (ICON 0.4) 14.8 (+7.6; 153/32)

**l2** (n = 5,495): ICON alone 23.5 (+10.6; 1454/292); ECMWF alone 17.7 (-3.4; 533/649); old blend (ICON 0.6) 19.4 (+5.0; 1074/303); app blend (ICON 0.4) 18.2 (+2.2; 814/395)

**l2 day** (n = 4,396): ICON alone 24.0 (+9.8; 1159/261); ECMWF alone 18.9 (-4.6; 442/575); old blend (ICON 0.6) 20.0 (+4.0; 855/273); app blend (ICON 0.4) 18.9 (+1.1; 667/355)

**l2 night** (n = 1,099): ICON alone 21.2 (+14.2; 295/31); ECMWF alone 12.9 (+1.4; 91/74); old blend (ICON 0.6) 17.1 (+9.1; 219/30); app blend (ICON 0.4) 15.4 (+6.5; 147/40)

**l4** (n = 5,600): ICON alone 24.5 (+10.0; 1499/328); ECMWF alone 19.9 (-5.0; 565/773); old blend (ICON 0.6) 21.0 (+4.0; 1099/386); app blend (ICON 0.4) 20.0 (+1.0; 828/513)

**l4 day** (n = 4,480): ICON alone 24.4 (+8.5; 1168/281); ECMWF alone 21.0 (-6.7; 454/685); old blend (ICON 0.6) 21.2 (+2.4; 838/344); app blend (ICON 0.4) 20.4 (-0.6; 648/462)

**l4 night** (n = 1,120): ICON alone 25.0 (+16.1; 331/47); ECMWF alone 15.7 (+1.8; 111/88); old blend (ICON 0.6) 20.3 (+10.4; 261/42); app blend (ICON 0.4) 18.4 (+7.5; 180/51)

**l6** (n = 5,565): ICON alone 26.9 (+8.7; 1508/473); ECMWF alone 22.5 (-4.6; 660/836); old blend (ICON 0.6) 22.6 (+0.7; 961/591); app blend (ICON 0.4) 22.6 (+0.7; 961/591)

**l6 day** (n = 4,452): ICON alone 26.4 (+7.1; 1143/396); ECMWF alone 23.0 (-6.4; 507/734); old blend (ICON 0.6) 22.5 (-1.0; 720/511); app blend (ICON 0.4) 22.5 (-1.0; 720/511)

**l6 night** (n = 1,113): ICON alone 29.1 (+14.9; 365/77); ECMWF alone 20.5 (+2.6; 153/102); old blend (ICON 0.6) 22.9 (+7.5; 241/80); app blend (ICON 0.4) 22.9 (+7.5; 241/80)
