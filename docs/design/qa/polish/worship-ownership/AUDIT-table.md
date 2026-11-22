# Worship ownership audit

Phase 1 covers 1,780 places at 375 and 1280 px, including 490 synagogue-only places. Recorded terrain uses the bundled panoramas for 18 places. Flat terrain uses the probe's 100 m elevation fallback for the remaining 1,762 places. Classification counts worship landmarks inside the own built footprint. Each glyph at each width contributes one row.

The baseline comes from `summary.txt`, `analysis.txt`, and `inspect-bc.txt`. The saved row export `audit-raw.json` supplies the full two-width detail and place counts. Karmei Tzur's audit point (31.6047, 35.1081) and its production point (31.6092, 35.1009) appear separately. The added production row describes the measured 375 px scene, where the seat is 6.46 km from the camera, the glyph foot is at 78.2% of scene height, and the highest own roof is at 77.3%. The production terrain is the scene observed in production.

## Synagogue-only places

| Place | Terrain | Width px | Glyph | Landmark ID | Landmark name | Place distance km | Ownership | World plane | Height m (evidence) | Seat block (cluster) | Glyph x px | Own x px | Overlap | Drawn height px | Group |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| שדמות מחולה (shadmot-mehola) | recorded | 375 | synagogue | il-synagogue-32.34648-35.53245 | (unnamed) | 0.01 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 149.9–211.4 | true | 9.50 | B |
| שדמות מחולה (shadmot-mehola) | recorded | 1280 | synagogue | il-synagogue-32.34648-35.53245 | (unnamed) | 0.01 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 511.7–721.5 | true | 9.50 | B |
| ראש פינה (rosh-pina) | recorded | 375 | synagogue | il-synagogue-32.96568-35.54287 | בית המדרש ראש פינה | 0.33 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 65.6–213.0 | true | 9.50 | B |
| ראש פינה (rosh-pina) | recorded | 1280 | synagogue | il-synagogue-32.96568-35.54287 | בית המדרש ראש פינה | 0.33 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 224.0–727.1 | true | 9.50 | B |
| רמת גן (ramat-gan) | recorded | 375 | synagogue | il-synagogue-32.08155-34.81205 | בית הכנסת האיטלקי | 0.15 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 66.7–221.3 | true | 9.50 | B |
| רמת גן (ramat-gan) | recorded | 1280 | synagogue | il-synagogue-32.08155-34.81205 | בית הכנסת האיטלקי | 0.15 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 227.5–755.4 | true | 9.50 | B |
| נתניה (netanya) | recorded | 375 | synagogue | il-synagogue-32.33509-34.85614 | היכל רפאל | 0.43 | own | near | 9 (HALL_M default (legacy 9m)) | none | 196.1–207.1 | 96.2–236.1 | true | 9.50 | B |
| נתניה (netanya) | recorded | 1280 | synagogue | il-synagogue-32.33509-34.85614 | היכל רפאל | 0.43 | own | near | 9 (HALL_M default (legacy 9m)) | none | 682.5–693.5 | 328.3–806.0 | true | 9.50 | B |
| זכרון יעקב (zikhron-yaakov) | recorded | 375 | synagogue | il-synagogue-32.57398-34.95381 | בית כנסת אוהל יעקב | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 75.9–236.5 | true | 9.50 | B |
| זכרון יעקב (zikhron-yaakov) | recorded | 375 | synagogue | il-synagogue-32.56936-34.9456 | זכרון טוב | 0.66 | own | near | 9 (HALL_M default (legacy 9m)) | none | 202.8–213.8 | 75.9–236.5 | true | 9.50 | B |
| זכרון יעקב (zikhron-yaakov) | recorded | 1280 | synagogue | il-synagogue-32.57398-34.95381 | בית כנסת אוהל יעקב | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 259.0–807.4 | true | 9.50 | B |
| זכרון יעקב (zikhron-yaakov) | recorded | 1280 | synagogue | il-synagogue-32.56936-34.9456 | זכרון טוב | 0.66 | own | near | 9 (HALL_M default (legacy 9m)) | none | 705.3–716.3 | 259.0–807.4 | true | 9.50 | B |
| בית שאן (beit-shean) | recorded | 375 | synagogue | il-synagogue-32.49894-35.49309 | בית כנסת ע"ש ג'ריבת ג'רבה | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.2–205.2 | 126.4–232.2 | true | 9.50 | B |
| בית שאן (beit-shean) | recorded | 1280 | synagogue | il-synagogue-32.49894-35.49309 | בית כנסת ע"ש ג'ריבת ג'רבה | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 676.1–687.1 | 431.4–792.4 | true | 9.50 | B |
| כרמי צור (karmei-tzur) | flat | 375 | synagogue | il-synagogue-31.6097-35.10159 | שבת אחים - בית כנסתספרדי | 0.83 | own | near | 9 (HALL_M default (legacy 9m)) | none | 215.7–226.7 | 193.3–245.5 | true | 9.50 | B |
| כרמי צור (karmei-tzur) | flat | 1280 | synagogue | il-synagogue-31.6097-35.10159 | שבת אחים - בית כנסתספרדי | 0.83 | own | near | 9 (HALL_M default (legacy 9m)) | none | 749.4–760.4 | 654.0–838.0 | true | 9.50 | B |
| אילת (il-29.5569-34.9498) | flat | 375 | synagogue | il-synagogue-29.55241-34.95227 | (unnamed) | 0.56 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 79.2–300.6 | true | 9.50 | B |
| אילת (il-29.5569-34.9498) | flat | 375 | synagogue | il-synagogue-29.55914-34.93893 | (unnamed) | 1.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 216.5–227.5 | 79.2–300.6 | true | 9.50 | B |
| אילת (il-29.5569-34.9498) | flat | 1280 | synagogue | il-synagogue-29.55241-34.95227 | (unnamed) | 0.56 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 270.4–1026.1 | true | 9.50 | B |
| אילת (il-29.5569-34.9498) | flat | 1280 | synagogue | il-synagogue-29.55914-34.93893 | (unnamed) | 1.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 752.1–763.1 | 270.4–1026.1 | true | 9.50 | B |
| מצפה רמון (il-30.6120-34.8012) | flat | 375 | synagogue | il-synagogue-30.61323-34.79719 | (unnamed) | 0.41 | own | near | 9 (HALL_M default (legacy 9m)) | none | 197.7–208.7 | 119.6–213.8 | true | 9.50 | B |
| מצפה רמון (il-30.6120-34.8012) | flat | 1280 | synagogue | il-synagogue-30.61323-34.79719 | (unnamed) | 0.41 | own | near | 9 (HALL_M default (legacy 9m)) | none | 688.0–699.0 | 408.1–729.8 | true | 9.50 | B |
| מדרשת בן גוריון (il-30.8516-34.7826) | flat | 375 | synagogue | il-synagogue-30.85092-34.78227 | תפארת עזרא | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 147.1–243.6 | true | 9.50 | B |
| מדרשת בן גוריון (il-30.8516-34.7826) | flat | 1280 | synagogue | il-synagogue-30.85092-34.78227 | תפארת עזרא | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 502.0–831.4 | true | 9.50 | B |
| עידן (il-30.8060-35.2994) | flat | 375 | synagogue | il-synagogue-30.80657-35.3 | (unnamed) | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 165.6–205.9 | true | 9.50 | B |
| עידן (il-30.8060-35.2994) | flat | 1280 | synagogue | il-synagogue-30.80657-35.3 | (unnamed) | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 565.2–702.7 | true | 9.50 | B |
| רתמים (il-31.0539-34.6904) | flat | 375 | synagogue | il-synagogue-31.05492-34.69046 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 115.5–213.5 | true | 9.50 | B |
| רתמים (il-31.0539-34.6904) | flat | 1280 | synagogue | il-synagogue-31.05492-34.69046 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 394.3–728.7 | true | 9.50 | B |
| בני נצרים (il-31.1410-34.3147) | flat | 375 | synagogue | il-synagogue-31.14099-34.31383 | בית הכנסת המרכזי בני נצרים | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 126.3–206.8 | true | 9.50 | B |
| בני נצרים (il-31.1410-34.3147) | flat | 1280 | synagogue | il-synagogue-31.14099-34.31383 | בית הכנסת המרכזי בני נצרים | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 431.1–705.8 | true | 9.50 | B |
| נווה (il-31.1621-34.3301) | flat | 375 | synagogue | il-synagogue-31.16174-34.33136 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 150.7–242.7 | true | 9.50 | B |
| נווה (il-31.1621-34.3301) | flat | 1280 | synagogue | il-synagogue-31.16174-34.33136 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 514.5–828.5 | true | 9.50 | B |
| אופקים (il-31.3126-34.6208) | flat | 375 | synagogue | il-synagogue-31.31383-34.62111 | עץ חיים | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 104.6–244.5 | true | 9.50 | B |
| אופקים (il-31.3126-34.6208) | flat | 1280 | synagogue | il-synagogue-31.31383-34.62111 | עץ חיים | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 357.2–834.5 | true | 9.50 | B |
| נבטים (il-31.2225-34.8808) | flat | 375 | synagogue | il-synagogue-31.22184-34.88649 | בית כנסת ישן נבטים | 0.55 | own | near | 9 (HALL_M default (legacy 9m)) | none | 161.2–172.2 | 114.0–266.6 | true | 9.50 | B |
| נבטים (il-31.2225-34.8808) | flat | 375 | synagogue | il-synagogue-31.22509-34.87406 | בית כנסת נבטים חדש | 0.70 | own | near | 9 (HALL_M default (legacy 9m)) | none | 208.4–219.4 | 114.0–266.6 | true | 9.50 | B |
| נבטים (il-31.2225-34.8808) | flat | 1280 | synagogue | il-synagogue-31.22184-34.88649 | בית כנסת ישן נבטים | 0.55 | own | near | 9 (HALL_M default (legacy 9m)) | none | 563.5–574.5 | 389.1–910.1 | true | 9.50 | B |
| נבטים (il-31.2225-34.8808) | flat | 1280 | synagogue | il-synagogue-31.22509-34.87406 | בית כנסת נבטים חדש | 0.70 | own | near | 9 (HALL_M default (legacy 9m)) | none | 724.6–735.6 | 389.1–910.1 | true | 9.50 | B |
| ערד (il-31.2612-35.2146) | flat | 375 | synagogue | il-synagogue-31.26737-35.21311 | (unnamed) | 0.70 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 136.9–320.9 | true | 9.50 | B |
| ערד (il-31.2612-35.2146) | flat | 1280 | synagogue | il-synagogue-31.26737-35.21311 | (unnamed) | 0.70 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 467.2–1095.2 | true | 9.50 | B |
| עין השלושה (il-31.3514-34.4010) | flat | 375 | synagogue | il-synagogue-31.35239-34.40034 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 144.8–215.7 | true | 9.50 | B |
| עין השלושה (il-31.3514-34.4010) | flat | 1280 | synagogue | il-synagogue-31.35239-34.40034 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 494.3–736.3 | true | 9.50 | B |
| מעגלים (il-31.3974-34.5983) | flat | 375 | synagogue | il-synagogue-31.39962-34.5978 | בית מדרש | 0.25 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 157.3–227.1 | true | 9.50 | B |
| מעגלים (il-31.3974-34.5983) | flat | 1280 | synagogue | il-synagogue-31.39962-34.5978 | בית מדרש | 0.25 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 537.1–775.2 | true | 9.50 | B |
| גילת (il-31.3292-34.6516) | flat | 375 | synagogue | il-synagogue-31.32992-34.65199 | בית הכנסת מגן שלמה | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 129.3–260.1 | true | 9.50 | B |
| גילת (il-31.3292-34.6516) | flat | 1280 | synagogue | il-synagogue-31.32992-34.65199 | בית הכנסת מגן שלמה | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 441.5–887.9 | true | 9.50 | B |
| בטחה (il-31.3343-34.6345) | flat | 375 | synagogue | il-synagogue-31.33276-34.63337 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 120.3–227.0 | true | 9.50 | B |
| בטחה (il-31.3343-34.6345) | flat | 1280 | synagogue | il-synagogue-31.33276-34.63337 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 410.6–774.9 | true | 9.50 | B |
| תדהר (il-31.3790-34.6285) | flat | 375 | synagogue | il-synagogue-31.37872-34.63134 | (unnamed) | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 169.3–180.3 | 154.4–263.1 | true | 9.50 | B |
| תדהר (il-31.3790-34.6285) | flat | 1280 | synagogue | il-synagogue-31.37872-34.63134 | (unnamed) | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 591.2–602.2 | 527.1–898.1 | true | 9.50 | B |
| שיבולים (il-31.3960-34.6089) | flat | 375 | synagogue | il-synagogue-31.39649-34.60801 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 148.9–217.5 | true | 9.50 | B |
| שיבולים (il-31.3960-34.6089) | flat | 1280 | synagogue | il-synagogue-31.39649-34.60801 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 508.3–742.4 | true | 9.50 | B |
| כרמית (il-31.3316-34.8935) | flat | 375 | synagogue | il-synagogue-31.33045-34.8915 | בית הכנסת ע"ש רוברט ושירלי לויט | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 121.3–209.0 | true | 9.50 | B |
| כרמית (il-31.3316-34.8935) | flat | 1280 | synagogue | il-synagogue-31.33045-34.8915 | בית הכנסת ע"ש רוברט ושירלי לויט | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 414.0–713.4 | true | 9.50 | B |
| להבים (il-31.3703-34.8137) | flat | 375 | synagogue | il-synagogue-31.37313-34.81678 | (unnamed) | 0.43 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 143.0–274.4 | true | 9.50 | B |
| להבים (il-31.3703-34.8137) | flat | 1280 | synagogue | il-synagogue-31.37313-34.81678 | (unnamed) | 0.43 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 488.1–936.6 | true | 9.50 | B |
| מיתר (il-31.3271-34.9384) | flat | 375 | synagogue | il-synagogue-31.32245-34.94309 | אור שלום | 0.68 | own | near | 9 (HALL_M default (legacy 9m)) | none | 168.7–179.7 | 148.1–260.3 | true | 9.50 | B |
| מיתר (il-31.3271-34.9384) | flat | 375 | synagogue | il-synagogue-31.32704-34.93633 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 148.1–260.3 | true | 9.50 | B |
| מיתר (il-31.3271-34.9384) | flat | 1280 | synagogue | il-synagogue-31.32245-34.94309 | אור שלום | 0.68 | own | near | 9 (HALL_M default (legacy 9m)) | none | 589.0–600.0 | 505.7–888.6 | true | 9.50 | B |
| מיתר (il-31.3271-34.9384) | flat | 1280 | synagogue | il-synagogue-31.32704-34.93633 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 505.7–888.6 | true | 9.50 | B |
| טנא עומרים (il-31.3757-34.9573) | flat | 375 | synagogue | il-synagogue-31.37771-34.95681 | (unnamed) | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 170.0–234.1 | true | 9.50 | B |
| טנא עומרים (il-31.3757-34.9573) | flat | 1280 | synagogue | il-synagogue-31.37771-34.95681 | (unnamed) | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 580.3–798.9 | true | 9.50 | B |
| עשהאל (il-31.3734-35.0438) | flat | 375 | synagogue | il-synagogue-31.37326-35.04383 | (unnamed) | 0.02 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 122.8–258.1 | true | 9.50 | B |
| עשהאל (il-31.3734-35.0438) | flat | 1280 | synagogue | il-synagogue-31.37326-35.04383 | (unnamed) | 0.02 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 419.3–880.9 | true | 9.50 | B |
| בית יתיר (il-31.3655-35.1117) | flat | 375 | synagogue | il-synagogue-31.36279-35.11447 | (unnamed) | 0.40 | own | near | 9 (HALL_M default (legacy 9m)) | none | 167.9–178.9 | 161.7–224.0 | true | 9.50 | B |
| בית יתיר (il-31.3655-35.1117) | flat | 1280 | synagogue | il-synagogue-31.36279-35.11447 | (unnamed) | 0.40 | own | near | 9 (HALL_M default (legacy 9m)) | none | 586.4–597.4 | 551.9–764.7 | true | 9.50 | B |
| מצפה יאיר (il-31.3833-35.1348) | flat | 375 | synagogue | il-synagogue-31.38341-35.13472 | (unnamed) | 0.02 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 157.0–162.5 | false | 9.50 | B |
| מצפה יאיר (il-31.3833-35.1348) | flat | 1280 | synagogue | il-synagogue-31.38341-35.13472 | (unnamed) | 0.02 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 535.8–625.5 | false | 9.50 | B |
| סוסיה (il-31.3920-35.1135) | flat | 375 | synagogue | il-synagogue-31.39221-35.11236 | בית כנסת סוסיא | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 128.7–207.4 | true | 9.50 | B |
| סוסיה (il-31.3920-35.1135) | flat | 1280 | synagogue | il-synagogue-31.39221-35.11236 | בית כנסת סוסיא | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 439.1–707.9 | true | 9.50 | B |
| נתיבות (il-31.4214-34.5884) | flat | 375 | synagogue | il-synagogue-31.41765-34.58676 | (unnamed) | 0.44 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 109.6–278.2 | true | 9.50 | B |
| נתיבות (il-31.4214-34.5884) | flat | 375 | synagogue | il-synagogue-31.42215-34.59248 | (unnamed) | 0.39 | own | near | 9 (HALL_M default (legacy 9m)) | none | 169.1–180.1 | 109.6–278.2 | true | 9.50 | B |
| נתיבות (il-31.4214-34.5884) | flat | 375 | synagogue | il-synagogue-31.43615-34.58372 | בית כנסת משכן יהודה | 1.71 | own | near | 9 (HALL_M default (legacy 9m)) | none | 201.8–212.8 | 109.6–278.2 | true | 9.50 | B |
| נתיבות (il-31.4214-34.5884) | flat | 1280 | synagogue | il-synagogue-31.41765-34.58676 | (unnamed) | 0.44 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 374.2–949.6 | true | 9.50 | B |
| נתיבות (il-31.4214-34.5884) | flat | 1280 | synagogue | il-synagogue-31.42215-34.59248 | (unnamed) | 0.39 | own | near | 9 (HALL_M default (legacy 9m)) | none | 590.4–601.4 | 374.2–949.6 | true | 9.50 | B |
| נתיבות (il-31.4214-34.5884) | flat | 1280 | synagogue | il-synagogue-31.43615-34.58372 | בית כנסת משכן יהודה | 1.71 | own | near | 9 (HALL_M default (legacy 9m)) | none | 702.1–713.1 | 374.2–949.6 | true | 9.50 | B |
| תקומה (il-31.4486-34.5776) | flat | 375 | synagogue | il-synagogue-31.43991-34.57704 | (unnamed) | 0.96 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 109.4–242.7 | true | 9.50 | B |
| תקומה (il-31.4486-34.5776) | flat | 375 | synagogue | il-synagogue-31.44996-34.57796 | היכל תקומה | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 109.4–242.7 | true | 9.50 | B |
| תקומה (il-31.4486-34.5776) | flat | 1280 | synagogue | il-synagogue-31.43991-34.57704 | (unnamed) | 0.96 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 373.4–828.3 | true | 9.50 | B |
| תקומה (il-31.4486-34.5776) | flat | 1280 | synagogue | il-synagogue-31.44996-34.57796 | היכל תקומה | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 373.4–828.3 | true | 9.50 | B |
| תושייה (il-31.4332-34.5412) | flat | 375 | synagogue | il-synagogue-31.43346-34.53872 | (unnamed) | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 130.0–210.9 | true | 9.50 | B |
| תושייה (il-31.4332-34.5412) | flat | 1280 | synagogue | il-synagogue-31.43346-34.53872 | (unnamed) | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 443.7–719.9 | true | 9.50 | B |
| שובה (il-31.4500-34.5454) | flat | 375 | synagogue | il-synagogue-31.4505-34.54511 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 144.0–225.6 | true | 9.50 | B |
| שובה (il-31.4500-34.5454) | flat | 1280 | synagogue | il-synagogue-31.4505-34.54511 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 491.7–770.1 | true | 9.50 | B |
| סעד (il-31.4700-34.5355) | flat | 375 | synagogue | il-synagogue-31.47031-34.53274 | Beit Aharon | 0.27 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 117.9–239.2 | true | 9.50 | B |
| סעד (il-31.4700-34.5355) | flat | 1280 | synagogue | il-synagogue-31.47031-34.53274 | Beit Aharon | 0.27 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 402.4–816.6 | true | 9.50 | B |
| שבי דרום (il-31.4656-34.6358) | flat | 375 | synagogue | il-synagogue-31.46561-34.63577 | (unnamed) | 0.01 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 150.3–209.7 | true | 9.50 | B |
| שבי דרום (il-31.4656-34.6358) | flat | 375 | minaret | il-minaret-31.4998-34.46938 | Ibn Othman Mosque | 16.24 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 339.6–346.2 | 150.3–209.7 | false | 8.00 | D |
| שבי דרום (il-31.4656-34.6358) | flat | 1280 | synagogue | il-synagogue-31.46561-34.63577 | (unnamed) | 0.01 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 513.0–715.8 | true | 9.50 | B |
| שבי דרום (il-31.4656-34.6358) | flat | 1280 | minaret | il-minaret-31.4998-34.46938 | Ibn Othman Mosque | 16.24 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1167.1–1173.7 | 513.0–715.8 | false | 8.00 | D |
| שומריה (il-31.4318-34.8858) | flat | 375 | synagogue | il-synagogue-31.4321-34.88227 | (unnamed) | 0.34 | own | near | 9 (HALL_M default (legacy 9m)) | none | 195.3–206.3 | 112.6–276.4 | true | 9.50 | B |
| שומריה (il-31.4318-34.8858) | flat | 1280 | synagogue | il-synagogue-31.4321-34.88227 | (unnamed) | 0.34 | own | near | 9 (HALL_M default (legacy 9m)) | none | 679.8–690.8 | 384.4–943.5 | true | 9.50 | B |
| נגוהות (il-31.4932-34.9834) | flat | 375 | synagogue | il-synagogue-31.49322-34.98337 | בית כנסת נחלת יצחק | 0.00 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 115.0–201.9 | true | 9.50 | B |
| נגוהות (il-31.4932-34.9834) | flat | 375 | minaret | il-minaret-31.5283-35.10379 | مسجد علي البكاء | 12.06 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 20.9–27.5 | 115.0–201.9 | false | 8.00 | D |
| נגוהות (il-31.4932-34.9834) | flat | 1280 | synagogue | il-synagogue-31.49322-34.98337 | בית כנסת נחלת יצחק | 0.00 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 392.4–689.2 | true | 9.50 | B |
| נגוהות (il-31.4932-34.9834) | flat | 1280 | minaret | il-minaret-31.5283-35.10379 | مسجد علي البكاء | 12.06 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 79.2–85.8 | 392.4–689.2 | false | 8.00 | D |
| עתניאל (il-31.4393-35.0286) | flat | 375 | minaret | il-minaret-31.41737-34.9841 | مسجد مخلص | 4.87 | beyond | near | 9 (HALL_M default (legacy 30m)) | 314_349:67:8 (ד'הרייה) | 295.0–297.5 | 161.8–253.4 | false | 3.04 | A |
| עתניאל (il-31.4393-35.0286) | flat | 375 | synagogue | il-synagogue-31.44096-35.0282 | בית הכנסת המרכזי | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 161.8–253.4 | true | 9.50 | B |
| עתניאל (il-31.4393-35.0286) | flat | 1280 | minaret | il-minaret-31.41737-34.9841 | مسجد مخلص | 4.87 | beyond | near | 9 (HALL_M default (legacy 30m)) | 314_349:67:8 (ד'הרייה) | 1010.0–1012.5 | 552.3–864.9 | false | 3.04 | A |
| עתניאל (il-31.4393-35.0286) | flat | 1280 | synagogue | il-synagogue-31.44096-35.0282 | בית הכנסת המרכזי | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 552.3–864.9 | true | 9.50 | B |
| קרית ארבע (il-31.5278-35.1192) | flat | 375 | synagogue | il-synagogue-31.53004-35.12048 | מכון לרבני ישובים | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 127.3–248.5 | true | 9.50 | B |
| קרית ארבע (il-31.5278-35.1192) | flat | 375 | minaret | il-minaret-31.53042-35.09808 | Al-Atqia' Mosque | 2.02 | beyond | near | 9 (HALL_M default (legacy 30m)) | 315_350:78:14 (חברון) | 271.1–275.0 | 127.3–248.5 | false | 4.73 | A |
| קרית ארבע (il-31.5278-35.1192) | flat | 375 | minaret | il-minaret-31.53186-35.10687 | مسجد أبو عبيدة | 1.25 | beyond | near | 9 (HALL_M default (legacy 30m)) | 315_351:5:15 (חברון) | 236.4–240.4 | 127.3–248.5 | true | 4.82 | C |
| קרית ארבע (il-31.5278-35.1192) | flat | 1280 | synagogue | il-synagogue-31.53004-35.12048 | מכון לרבני ישובים | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 434.7–848.2 | true | 9.50 | B |
| קרית ארבע (il-31.5278-35.1192) | flat | 1280 | minaret | il-minaret-31.53042-35.09808 | Al-Atqia' Mosque | 2.02 | beyond | near | 9 (HALL_M default (legacy 30m)) | 315_350:78:14 (חברון) | 930.2–934.1 | 434.7–848.2 | false | 4.73 | A |
| קרית ארבע (il-31.5278-35.1192) | flat | 1280 | minaret | il-minaret-31.53186-35.10687 | مسجد أبو عبيدة | 1.25 | beyond | near | 9 (HALL_M default (legacy 30m)) | 315_351:5:15 (חברון) | 811.8–815.7 | 434.7–848.2 | true | 4.82 | C |
| כרמל (il-31.4309-35.1833) | flat | 375 | synagogue | il-synagogue-31.43126-35.18245 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 193.4–225.4 | true | 9.50 | B |
| כרמל (il-31.4309-35.1833) | flat | 1280 | synagogue | il-synagogue-31.43126-35.18245 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 616.1–769.3 | true | 9.50 | B |
| שדרות (il-31.5265-34.5970) | flat | 375 | synagogue | il-synagogue-31.52363-34.59625 | (unnamed) | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 125.1–265.7 | true | 9.50 | B |
| שדרות (il-31.5265-34.5970) | flat | 375 | synagogue | il-synagogue-31.52979-34.58649 | בית כנסת משכן שלום | 1.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 223.4–234.4 | 125.1–265.7 | true | 9.50 | B |
| שדרות (il-31.5265-34.5970) | flat | 375 | minaret | il-minaret-31.54784-34.45576 | مسجد الخالدي | 13.59 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 334.4–341.0 | 125.1–265.7 | false | 8.00 | D |
| שדרות (il-31.5265-34.5970) | flat | 1280 | synagogue | il-synagogue-31.52363-34.59625 | (unnamed) | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 426.9–906.9 | true | 9.50 | B |
| שדרות (il-31.5265-34.5970) | flat | 1280 | synagogue | il-synagogue-31.52979-34.58649 | בית כנסת משכן שלום | 1.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 775.7–786.7 | 426.9–906.9 | true | 9.50 | B |
| שדרות (il-31.5265-34.5970) | flat | 1280 | minaret | il-minaret-31.54784-34.45576 | مسجد الخالدي | 13.59 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1149.2–1155.8 | 426.9–906.9 | false | 8.00 | D |
| בני דקלים (il-31.5175-34.9199) | flat | 375 | synagogue | il-synagogue-31.51744-34.92135 | בית הכנסת המרכזי | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 162.3–231.2 | true | 9.50 | B |
| בני דקלים (il-31.5175-34.9199) | flat | 1280 | synagogue | il-synagogue-31.51744-34.92135 | בית הכנסת המרכזי | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 553.9–789.3 | true | 9.50 | B |
| אליאב (il-31.5299-34.9315) | flat | 375 | minaret | il-minaret-31.5283-35.10379 | مسجد علي البكاء | 16.33 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 50.1–56.7 | 114.7–211.7 | false | 8.00 | D |
| אליאב (il-31.5299-34.9315) | flat | 1280 | minaret | il-minaret-31.5283-35.10379 | مسجد علي البكاء | 16.33 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 178.9–185.5 | 391.6–722.8 | false | 8.00 | D |
| אדורה (il-31.5519-35.0165) | flat | 375 | minaret | il-minaret-31.5283-35.10379 | مسجد علي البكاء | 8.68 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 75.6–82.2 | 144.7–211.7 | false | 8.00 | D |
| אדורה (il-31.5519-35.0165) | flat | 1280 | minaret | il-minaret-31.5283-35.10379 | مسجد علي البكاء | 8.68 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 266.0–272.6 | 494.0–722.6 | false | 8.00 | D |
| תלם (il-31.5635-35.0310) | flat | 375 | synagogue | il-synagogue-31.56196-35.03256 | ישיבת נתיבות דרור תלם | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 116.5–206.1 | true | 9.50 | B |
| תלם (il-31.5635-35.0310) | flat | 1280 | synagogue | il-synagogue-31.56196-35.03256 | ישיבת נתיבות דרור תלם | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 397.7–703.3 | true | 9.50 | B |
| מעלה עמוס (il-31.5969-35.2285) | flat | 375 | synagogue | il-synagogue-31.59717-35.22827 | בית הכנסת "בית זכריה" | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 167.1–227.6 | true | 9.50 | B |
| מעלה עמוס (il-31.5969-35.2285) | flat | 1280 | synagogue | il-synagogue-31.59717-35.22827 | בית הכנסת "בית זכריה" | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 570.3–777.0 | true | 9.50 | B |
| נגבה (il-31.6623-34.6827) | flat | 375 | synagogue | il-synagogue-31.65666-34.68358 | (unnamed) | 0.64 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 167.5–270.1 | true | 9.50 | B |
| נגבה (il-31.6623-34.6827) | flat | 1280 | synagogue | il-synagogue-31.65666-34.68358 | (unnamed) | 0.64 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 571.8–921.8 | true | 9.50 | B |
| משואות יצחק (il-31.7023-34.6899) | flat | 375 | synagogue | il-synagogue-31.70272-34.68863 | (unnamed) | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 159.8–252.2 | true | 9.50 | B |
| משואות יצחק (il-31.7023-34.6899) | flat | 1280 | synagogue | il-synagogue-31.70272-34.68863 | (unnamed) | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 545.4–860.8 | true | 9.50 | B |
| מרכז שפירא (il-31.6952-34.7071) | flat | 375 | synagogue | il-synagogue-31.69466-34.70883 | אשמורת אברהם | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 129.8–244.5 | true | 9.50 | B |
| מרכז שפירא (il-31.6952-34.7071) | flat | 1280 | synagogue | il-synagogue-31.69466-34.70883 | אשמורת אברהם | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 443.1–834.7 | true | 9.50 | B |
| בת עין (il-31.6573-35.1032) | flat | 375 | synagogue | il-synagogue-31.65499-35.10587 | ישיבת בת עין | 0.36 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 123.3–240.4 | true | 9.50 | B |
| בת עין (il-31.6573-35.1032) | flat | 1280 | synagogue | il-synagogue-31.65499-35.10587 | ישיבת בת עין | 0.36 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 420.8–820.6 | true | 9.50 | B |
| כפר עציון (il-31.6487-35.1150) | flat | 375 | synagogue | il-synagogue-31.6483-35.11608 | בית מדרש ישיבת מקור חיים | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 145.6–215.1 | true | 9.50 | B |
| כפר עציון (il-31.6487-35.1150) | flat | 1280 | synagogue | il-synagogue-31.6483-35.11608 | בית מדרש ישיבת מקור חיים | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 497.1–734.1 | true | 9.50 | B |
| אלון שבות (il-31.6549-35.1268) | flat | 375 | minaret | il-minaret-31.62633-35.148 | مسجد | 3.76 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:38:12 (בית פג'אר) | 137.5–139.9 | 147.9–259.1 | false | 2.90 | A |
| אלון שבות (il-31.6549-35.1268) | flat | 375 | synagogue | il-synagogue-31.65326-35.12674 | בית כנסת ספרדי | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 147.9–259.1 | true | 9.50 | B |
| אלון שבות (il-31.6549-35.1268) | flat | 1280 | minaret | il-minaret-31.62633-35.148 | مسجد | 3.76 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:38:12 (בית פג'אר) | 472.3–474.7 | 505.0–884.3 | false | 2.90 | A |
| אלון שבות (il-31.6549-35.1268) | flat | 1280 | synagogue | il-synagogue-31.65326-35.12674 | בית כנסת ספרדי | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 505.0–884.3 | true | 9.50 | B |
| גבעות (il-31.6790-35.1011) | flat | 375 | minaret | il-minaret-31.70454-35.2054 | مسجد عمر | 10.27 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 25.0–31.6 | 156.9–199.1 | false | 8.00 | D |
| גבעות (il-31.6790-35.1011) | flat | 1280 | minaret | il-minaret-31.70454-35.2054 | مسجد عمر | 10.27 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 93.4–100.0 | 535.7–679.5 | false | 8.00 | D |
| ביתר עילית (il-31.6989-35.1137) | flat | 375 | synagogue | il-synagogue-31.70078-35.11481 | פינסק קרלין | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 121.4–246.3 | true | 9.50 | B |
| ביתר עילית (il-31.6989-35.1137) | flat | 375 | minaret | il-minaret-31.70454-35.2054 | مسجد عمر | 8.69 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 43.0–49.6 | 121.4–246.3 | false | 8.00 | D |
| ביתר עילית (il-31.6989-35.1137) | flat | 1280 | synagogue | il-synagogue-31.70078-35.11481 | פינסק קרלין | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 414.5–840.8 | true | 9.50 | B |
| ביתר עילית (il-31.6989-35.1137) | flat | 1280 | minaret | il-minaret-31.70454-35.2054 | مسجد عمر | 8.69 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 154.8–161.4 | 414.5–840.8 | false | 8.00 | D |
| הדר ביתר (il-31.7078-35.1114) | flat | 375 | synagogue | il-synagogue-31.70376-35.11433 | ישיבת עטרת שלמה | 0.52 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 119.8–233.0 | true | 9.50 | B |
| הדר ביתר (il-31.7078-35.1114) | flat | 375 | minaret | il-minaret-31.70454-35.2054 | مسجد عمر | 8.90 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 52.6–59.2 | 119.8–233.0 | false | 8.00 | D |
| הדר ביתר (il-31.7078-35.1114) | flat | 1280 | synagogue | il-synagogue-31.70376-35.11433 | ישיבת עטרת שלמה | 0.52 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 408.9–795.3 | true | 9.50 | B |
| הדר ביתר (il-31.7078-35.1114) | flat | 1280 | minaret | il-minaret-31.70454-35.2054 | مسجد عمر | 8.90 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 187.6–194.2 | 408.9–795.3 | false | 8.00 | D |
| צור הדסה (il-31.7157-35.0948) | flat | 375 | synagogue | il-synagogue-31.71261-35.09982 | מקווה טהרה צור הדסה | 0.58 | own | near | 9 (HALL_M default (legacy 9m)) | none | 160.8–171.8 | 130.9–231.7 | true | 9.50 | B |
| צור הדסה (il-31.7157-35.0948) | flat | 1280 | synagogue | il-synagogue-31.71261-35.09982 | מקווה טהרה צור הדסה | 0.58 | own | near | 9 (HALL_M default (legacy 9m)) | none | 562.3–573.3 | 446.9–790.8 | true | 9.50 | B |
| האתרוג (il-31.6971-35.1236) | flat | 375 | synagogue | il-synagogue-31.69655-35.11987 | שם משמעון | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 195.4–206.4 | 167.1–261.0 | true | 9.50 | B |
| האתרוג (il-31.6971-35.1236) | flat | 375 | minaret | il-minaret-31.70454-35.2054 | مسجد عمر | 7.79 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 40.1–46.7 | 167.1–261.0 | false | 8.00 | D |
| האתרוג (il-31.6971-35.1236) | flat | 1280 | synagogue | il-synagogue-31.69655-35.11987 | שם משמעון | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 680.2–691.2 | 570.4–891.0 | true | 9.50 | B |
| האתרוג (il-31.6971-35.1236) | flat | 1280 | minaret | il-minaret-31.70454-35.2054 | مسجد عمر | 7.79 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 144.7–151.3 | 570.4–891.0 | false | 8.00 | D |
| אלעזר (il-31.6607-35.1415) | flat | 375 | synagogue | il-synagogue-31.6603-35.14278 | מרכזי | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 163.1–231.5 | true | 9.50 | B |
| אלעזר (il-31.6607-35.1415) | flat | 375 | minaret | il-minaret-31.66558-35.16824 | מסגד ואדי רחל | 2.59 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:54:31 (ואדי רחאל) | 39.2–45.2 | 163.1–231.5 | false | 7.27 | A |
| אלעזר (il-31.6607-35.1415) | flat | 1280 | synagogue | il-synagogue-31.6603-35.14278 | מרכזי | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 556.9–790.1 | true | 9.50 | B |
| אלעזר (il-31.6607-35.1415) | flat | 1280 | minaret | il-minaret-31.66558-35.16824 | מסגד ואדי רחל | 2.59 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:54:31 (ואדי רחאל) | 140.9–146.9 | 556.9–790.1 | false | 7.27 | A |
| תל ציון (il-31.8796-35.2382) | flat | 375 | synagogue | il-synagogue-31.87657-35.24031 | בית המדרש ובית הכנסת תהילה לדוד | 0.40 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 173.6–261.2 | true | 9.50 | B |
| תל ציון (il-31.8796-35.2382) | flat | 375 | minaret | il-minaret-31.89272-35.20815 | مسجد الرحمن | 3.19 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:6:44 (אל בירה) | 349.1–354.4 | 173.6–261.2 | false | 6.33 | A |
| תל ציון (il-31.8796-35.2382) | flat | 1280 | synagogue | il-synagogue-31.87657-35.24031 | בית המדרש ובית הכנסת תהילה לדוד | 0.40 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 592.5–891.6 | true | 9.50 | B |
| תל ציון (il-31.8796-35.2382) | flat | 1280 | minaret | il-minaret-31.89272-35.20815 | مسجد الرحمن | 3.19 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:6:44 (אל בירה) | 1198.0–1203.2 | 592.5–891.6 | false | 6.33 | A |
| מעלה אדומים (il-31.7706-35.2985) | flat | 375 | minaret | il-minaret-31.76473-35.27793 | Al Nhayyan Mosque | 2.05 | beyond | near | 9 (HALL_M default (legacy 30m)) | 317_352:62:31 (ירושלים) | 237.2–239.9 | 55.8–253.2 | true | 3.27 | C |
| מעלה אדומים (il-31.7706-35.2985) | flat | 375 | minaret | il-minaret-31.76689-35.25256 | Al Faroq Mosque | 4.36 | beyond | near | 9 (HALL_M default (legacy 30m)) | 317_352:42:32 (ירושלים) | 303.5–306.3 | 55.8–253.2 | false | 3.36 | A |
| מעלה אדומים (il-31.7706-35.2985) | flat | 375 | church | il-church-31.7788-35.24738 | כנסיית העלייה הרוסית | 4.91 | beyond | near | 9 (HALL_M default (legacy 25m)) | 317_352:37:37 (ירושלים) | 341.3–344.4 | 55.8–253.2 | false | 3.99 | A |
| מעלה אדומים (il-31.7706-35.2985) | flat | 1280 | minaret | il-minaret-31.76473-35.27793 | Al Nhayyan Mosque | 2.05 | beyond | near | 9 (HALL_M default (legacy 30m)) | 317_352:62:31 (ירושלים) | 812.9–815.6 | 190.4–864.4 | true | 3.27 | C |
| מעלה אדומים (il-31.7706-35.2985) | flat | 1280 | minaret | il-minaret-31.76689-35.25256 | Al Faroq Mosque | 4.36 | beyond | near | 9 (HALL_M default (legacy 30m)) | 317_352:42:32 (ירושלים) | 1039.4–1042.2 | 190.4–864.4 | false | 3.36 | A |
| מעלה אדומים (il-31.7706-35.2985) | flat | 1280 | church | il-church-31.7788-35.24738 | כנסיית העלייה הרוסית | 4.91 | beyond | near | 9 (HALL_M default (legacy 25m)) | 317_352:37:37 (ירושלים) | 1168.6–1171.7 | 190.4–864.4 | false | 3.99 | A |
| כוכב יעקב (il-31.8814-35.2453) | flat | 375 | minaret | il-minaret-31.85336-35.23817 | Mo'ath Bin Jabal Mosque | 3.19 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:30:25 (א-ראם) | 205.1–208.2 | 156.6–229.2 | true | 3.83 | C |
| כוכב יעקב (il-31.8814-35.2453) | flat | 375 | minaret | il-minaret-31.85652-35.22653 | Sa'ed Bin Amer Mosque | 3.29 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:21:27 (א-ראם) | 239.9–243.3 | 156.6–229.2 | false | 4.11 | A |
| כוכב יעקב (il-31.8814-35.2453) | flat | 375 | synagogue | il-synagogue-31.88018-35.2426 | היכל מרדכי | 0.29 | own | near | 9 (HALL_M default (legacy 9m)) | none | 199.1–210.1 | 156.6–229.2 | true | 9.50 | B |
| כוכב יעקב (il-31.8814-35.2453) | flat | 1280 | minaret | il-minaret-31.85336-35.23817 | Mo'ath Bin Jabal Mosque | 3.19 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:30:25 (א-ראם) | 703.8–706.9 | 534.5–782.2 | true | 3.83 | C |
| כוכב יעקב (il-31.8814-35.2453) | flat | 1280 | minaret | il-minaret-31.85652-35.22653 | Sa'ed Bin Amer Mosque | 3.29 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:21:27 (א-ראם) | 823.1–826.5 | 534.5–782.2 | false | 4.11 | A |
| כוכב יעקב (il-31.8814-35.2453) | flat | 1280 | synagogue | il-synagogue-31.88018-35.2426 | היכל מרדכי | 0.29 | own | near | 9 (HALL_M default (legacy 9m)) | none | 692.9–703.9 | 534.5–782.2 | true | 9.50 | B |
| בית אל (il-31.9421-35.2224) | flat | 375 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 132.3–214.5 | true | 9.50 | B |
| בית אל (il-31.9421-35.2224) | flat | 1280 | minaret | il-minaret-31.9183-35.21075 | Al Kawthar Mosque | 2.86 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_352:8:8 (אל בירה) | 747.2–750.5 | 451.7–732.1 | false | 3.91 | A |
| בית אל (il-31.9421-35.2224) | flat | 1280 | minaret | il-minaret-31.90415-35.19605 | المسجد العمري | 4.90 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_351:76:1 (רמאללה) | 827.5–829.9 | 451.7–732.1 | false | 3.00 | A |
| בית אל (il-31.9421-35.2224) | flat | 1280 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 451.7–732.1 | true | 9.50 | B |
| ראשית (il-31.9364-35.2223) | flat | 375 | minaret | il-minaret-31.9183-35.21075 | Al Kawthar Mosque | 2.28 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_352:8:8 (אל בירה) | 221.5–224.6 | 132.6–214.5 | false | 3.81 | A |
| ראשית (il-31.9364-35.2223) | flat | 375 | minaret | il-minaret-31.92053-35.20462 | Alesra' Mosque | 2.42 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_352:3:9 (רמאללה) | 242.8–246.1 | 132.6–214.5 | false | 3.99 | A |
| ראשית (il-31.9364-35.2223) | flat | 375 | synagogue | il-synagogue-31.93544-35.22524 | תפארת שושנה | 0.30 | own | near | 9 (HALL_M default (legacy 9m)) | none | 168.3–179.3 | 132.6–214.5 | true | 9.50 | B |
| ראשית (il-31.9364-35.2223) | flat | 1280 | minaret | il-minaret-31.9183-35.21075 | Al Kawthar Mosque | 2.28 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_352:8:8 (אל בירה) | 759.9–763.0 | 452.7–732.2 | false | 3.81 | A |
| ראשית (il-31.9364-35.2223) | flat | 1280 | minaret | il-minaret-31.92053-35.20462 | Alesra' Mosque | 2.42 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_352:3:9 (רמאללה) | 832.8–836.1 | 452.7–732.2 | false | 3.99 | A |
| ראשית (il-31.9364-35.2223) | flat | 1280 | synagogue | il-synagogue-31.93544-35.22524 | תפארת שושנה | 0.30 | own | near | 9 (HALL_M default (legacy 9m)) | none | 587.8–598.8 | 452.7–732.2 | true | 9.50 | B |
| גבעת זאב (il-31.8623-35.1688) | flat | 375 | synagogue | il-synagogue-31.8588-35.168 | בית הכנסת סטולין קרלין | 0.40 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 145.4–298.2 | true | 9.50 | B |
| גבעת זאב (il-31.8623-35.1688) | flat | 1280 | synagogue | il-synagogue-31.8588-35.168 | בית הכנסת סטולין קרלין | 0.40 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 496.4–1018.0 | true | 9.50 | B |
| הר אדר (il-31.8269-35.1296) | flat | 375 | synagogue | il-synagogue-31.82483-35.13117 | בית כנסת הראל | 0.27 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 150.2–232.0 | true | 9.50 | B |
| הר אדר (il-31.8269-35.1296) | flat | 1280 | synagogue | il-synagogue-31.82483-35.13117 | בית כנסת הראל | 0.27 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 512.8–791.9 | true | 9.50 | B |
| מגדל עוז (il-31.6397-35.1425) | flat | 375 | minaret | il-minaret-31.6189-35.11126 | مسجد عصيرة | 3.76 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:9:9 (בית אומר) | 269.2–272.1 | 145.6–236.7 | false | 3.48 | A |
| מגדל עוז (il-31.6397-35.1425) | flat | 375 | synagogue | il-synagogue-31.64119-35.14251 | בית כנסת מגדל עוז | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 145.6–236.7 | true | 9.50 | B |
| מגדל עוז (il-31.6397-35.1425) | flat | 1280 | minaret | il-minaret-31.6189-35.11126 | مسجد عصيرة | 3.76 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:9:9 (בית אומר) | 922.3–925.2 | 496.8–808.0 | false | 3.48 | A |
| מגדל עוז (il-31.6397-35.1425) | flat | 1280 | synagogue | il-synagogue-31.64119-35.14251 | בית כנסת מגדל עוז | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 496.8–808.0 | true | 9.50 | B |
| ראש צורים (il-31.6676-35.1253) | flat | 375 | minaret | il-minaret-31.66558-35.16824 | מסגד ואדי רחל | 4.07 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:54:31 (ואדי רחאל) | 24.0–27.8 | 172.8–237.1 | false | 4.60 | A |
| ראש צורים (il-31.6676-35.1253) | flat | 375 | synagogue | il-synagogue-31.6678-35.12633 | בית כנסת ראש צורים | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 172.8–237.1 | true | 9.50 | B |
| ראש צורים (il-31.6676-35.1253) | flat | 1280 | minaret | il-minaret-31.66558-35.16824 | מסגד ואדי רחל | 4.07 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:54:31 (ואדי רחאל) | 86.5–90.2 | 589.8–809.3 | false | 4.60 | A |
| ראש צורים (il-31.6676-35.1253) | flat | 1280 | synagogue | il-synagogue-31.6678-35.12633 | בית כנסת ראש צורים | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 589.8–809.3 | true | 9.50 | B |
| נווה דניאל (il-31.6762-35.1428) | flat | 375 | minaret | il-minaret-31.66558-35.16824 | מסגד ואדי רחל | 2.68 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:54:31 (ואדי רחאל) | 96.4–100.1 | 126.9–212.7 | false | 4.59 | A |
| נווה דניאל (il-31.6762-35.1428) | flat | 375 | minaret | il-minaret-31.65388-35.16033 | מסגד אבו בכר ואדי א-ניס | 2.98 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:48:25 (ואדי א-ניס) | 138.8–141.8 | 126.9–212.7 | true | 3.52 | C |
| נווה דניאל (il-31.6762-35.1428) | flat | 375 | synagogue | il-synagogue-31.67668-35.14304 | בית כנסת מרכזי | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 126.9–212.7 | true | 9.50 | B |
| נווה דניאל (il-31.6762-35.1428) | flat | 1280 | minaret | il-minaret-31.66558-35.16824 | מסגד ואדי רחל | 2.68 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:54:31 (ואדי רחאל) | 333.5–337.3 | 433.3–726.0 | false | 4.59 | A |
| נווה דניאל (il-31.6762-35.1428) | flat | 1280 | minaret | il-minaret-31.65388-35.16033 | מסגד אבו בכר ואדי א-ניס | 2.98 | beyond | near | 9 (HALL_M default (legacy 30m)) | 316_351:48:25 (ואדי א-ניס) | 477.4–480.3 | 433.3–726.0 | true | 3.52 | C |
| נווה דניאל (il-31.6762-35.1428) | flat | 1280 | synagogue | il-synagogue-31.67668-35.14304 | בית כנסת מרכזי | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 433.3–726.0 | true | 9.50 | B |
| ניר גלים (il-31.8245-34.6820) | flat | 375 | synagogue | il-synagogue-31.82546-34.68248 | בית הכנסת המרכזי ניר גלים | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 122.2–231.3 | true | 9.50 | B |
| ניר גלים (il-31.8245-34.6820) | flat | 1280 | synagogue | il-synagogue-31.82546-34.68248 | בית הכנסת המרכזי ניר גלים | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 417.2–789.5 | true | 9.50 | B |
| בני דרום (il-31.8207-34.6916) | flat | 375 | synagogue | il-synagogue-31.82113-34.6923 | בית הכנסת האשכנזי | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 129.8–209.7 | true | 9.50 | B |
| בני דרום (il-31.8207-34.6916) | flat | 1280 | synagogue | il-synagogue-31.82113-34.6923 | בית הכנסת האשכנזי | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 443.1–715.7 | true | 9.50 | B |
| גן יבנה (il-31.7871-34.7097) | flat | 375 | synagogue | il-synagogue-31.79418-34.70273 | בית כנסת בן איש חי | 1.02 | own | near | 9 (HALL_M default (legacy 9m)) | none | 207.0–218.0 | 143.7–293.8 | true | 9.50 | B |
| גן יבנה (il-31.7871-34.7097) | flat | 1280 | synagogue | il-synagogue-31.79418-34.70273 | בית כנסת בן איש חי | 1.02 | own | near | 9 (HALL_M default (legacy 9m)) | none | 719.9–730.9 | 490.4–1002.8 | true | 9.50 | B |
| גן הדרום (il-31.8036-34.6998) | flat | 375 | synagogue | il-synagogue-31.79418-34.70273 | בית כנסת בן איש חי | 1.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 109.3–215.9 | true | 9.50 | B |
| גן הדרום (il-31.8036-34.6998) | flat | 1280 | synagogue | il-synagogue-31.79418-34.70273 | בית כנסת בן איש חי | 1.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 373.1–736.9 | true | 9.50 | B |
| כנות (il-31.8026-34.7524) | flat | 375 | synagogue | il-synagogue-31.80088-34.76091 | חסד ואמת | 0.83 | own | near | 9 (HALL_M default (legacy 9m)) | none | 148.3–159.3 | 128.5–219.5 | true | 9.50 | B |
| כנות (il-31.8026-34.7524) | flat | 1280 | synagogue | il-synagogue-31.80088-34.76091 | חסד ואמת | 0.83 | own | near | 9 (HALL_M default (legacy 9m)) | none | 519.6–530.6 | 438.5–749.2 | true | 9.50 | B |
| גני טל (il-31.7887-34.7912) | flat | 375 | synagogue | il-synagogue-31.78842-34.79461 | (unnamed) | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 169.8–180.8 | 139.1–257.2 | true | 9.50 | B |
| גני טל (il-31.7887-34.7912) | flat | 1280 | synagogue | il-synagogue-31.78842-34.79461 | (unnamed) | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 592.8–603.8 | 474.7–877.9 | true | 9.50 | B |
| בית חלקיה (il-31.7927-34.8108) | flat | 375 | synagogue | il-synagogue-31.78889-34.80613 | (unnamed) | 0.61 | own | near | 9 (HALL_M default (legacy 9m)) | none | 196.8–207.8 | 124.3–228.0 | true | 9.50 | B |
| בית חלקיה (il-31.7927-34.8108) | flat | 1280 | synagogue | il-synagogue-31.78889-34.80613 | (unnamed) | 0.61 | own | near | 9 (HALL_M default (legacy 9m)) | none | 685.0–696.0 | 424.4–778.2 | true | 9.50 | B |
| גדרה (il-31.8118-34.7804) | flat | 375 | synagogue | il-synagogue-31.81544-34.77392 | בית הכנסת ישורון | 0.74 | own | near | 9 (HALL_M default (legacy 9m)) | none | 209.5–220.5 | 144.1–252.9 | true | 9.50 | B |
| גדרה (il-31.8118-34.7804) | flat | 1280 | synagogue | il-synagogue-31.81544-34.77392 | בית הכנסת ישורון | 0.74 | own | near | 9 (HALL_M default (legacy 9m)) | none | 728.3–739.3 | 491.7–863.3 | true | 9.50 | B |
| מטע (il-31.7169-35.0616) | flat | 375 | synagogue | il-synagogue-31.71423-35.061 | מגדל דוד | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 156.3–229.3 | true | 9.50 | B |
| מטע (il-31.7169-35.0616) | flat | 1280 | synagogue | il-synagogue-31.71423-35.061 | מגדל דוד | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 533.5–782.7 | true | 9.50 | B |
| קרית יערים (il-31.8035-35.1013) | flat | 375 | synagogue | il-synagogue-31.8047-35.1043 | ישיבת באר יצחק | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 167.0–178.0 | 160.8–231.0 | true | 9.50 | B |
| קרית יערים (il-31.8035-35.1013) | flat | 1280 | synagogue | il-synagogue-31.8047-35.1043 | ישיבת באר יצחק | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 583.2–594.2 | 549.0–788.6 | true | 9.50 | B |
| מישור אדומים (il-31.8038-35.3293) | flat | 375 | synagogue | il-synagogue-31.8121-35.39333 | ישיבת מצפה יריחו מאור טוביה | 6.12 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 34.9–44.1 | 102.3–312.0 | false | 8.00 | D |
| מישור אדומים (il-31.8038-35.3293) | flat | 1280 | synagogue | il-synagogue-31.8121-35.39333 | ישיבת מצפה יריחו מאור טוביה | 6.12 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 130.2–139.4 | 349.3–1064.9 | false | 8.00 | D |
| ואדי סניסל (il-31.8019-35.3060) | flat | 375 | minaret | il-minaret-31.76768-35.28197 | Omar Bin Abd Al Azeez Mosque | 4.43 | beyond | near | 9 (HALL_M default (legacy 30m)) | 317_352:65:32 (ערב אל ג'האלין) | 237.7–239.8 | 124.2–243.8 | true | 2.64 | C |
| ואדי סניסל (il-31.8019-35.3060) | flat | 1280 | minaret | il-minaret-31.76768-35.28197 | Omar Bin Abd Al Azeez Mosque | 4.43 | beyond | near | 9 (HALL_M default (legacy 30m)) | 317_352:65:32 (ערב אל ג'האלין) | 813.9–816.1 | 424.0–832.2 | true | 2.64 | C |
| משגב דב (il-31.8199-34.7386) | flat | 375 | synagogue | il-synagogue-31.8207-34.73532 | בית כנסת אהל יוסף | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 198.8–209.8 | 156.9–233.8 | true | 9.50 | B |
| משגב דב (il-31.8199-34.7386) | flat | 1280 | synagogue | il-synagogue-31.8207-34.73532 | בית כנסת אהל יוסף | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 691.9–702.9 | 535.6–798.2 | true | 9.50 | B |
| עשרת (il-31.8248-34.7456) | flat | 375 | synagogue | il-synagogue-31.82573-34.74744 | בית כנסת אוהל הבנים | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 150.7–228.1 | true | 9.50 | B |
| עשרת (il-31.8248-34.7456) | flat | 1280 | synagogue | il-synagogue-31.82573-34.74744 | בית כנסת אוהל הבנים | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 514.4–778.5 | true | 9.50 | B |
| בית רבן - גבעת וושינגטון (il-31.8168-34.7281) | flat | 375 | synagogue | il-synagogue-31.81873-34.72205 | בית מדרש ישיבת כרם ביבנה | 0.61 | own | near | 9 (HALL_M default (legacy 9m)) | none | 209.3–220.3 | 160.1–249.4 | true | 9.50 | B |
| בית רבן - גבעת וושינגטון (il-31.8168-34.7281) | flat | 1280 | synagogue | il-synagogue-31.81873-34.72205 | בית מדרש ישיבת כרם ביבנה | 0.61 | own | near | 9 (HALL_M default (legacy 9m)) | none | 727.5–738.5 | 546.3–851.4 | true | 9.50 | B |
| קבוצת יבנה (il-31.8138-34.7191) | flat | 375 | synagogue | il-synagogue-31.81873-34.72205 | בית מדרש ישיבת כרם ביבנה | 0.61 | own | near | 9 (HALL_M default (legacy 9m)) | none | 167.6–178.6 | 161.0–260.6 | true | 9.50 | B |
| קבוצת יבנה (il-31.8138-34.7191) | flat | 1280 | synagogue | il-synagogue-31.81873-34.72205 | בית מדרש ישיבת כרם ביבנה | 0.61 | own | near | 9 (HALL_M default (legacy 9m)) | none | 585.3–596.3 | 549.7–889.4 | true | 9.50 | B |
| רחובות (il-31.8953-34.8106) | flat | 375 | synagogue | il-synagogue-31.89576-34.8168 | זה השער לה | 0.59 | own | near | 9 (HALL_M default (legacy 9m)) | none | 162.4–173.4 | 116.8–314.2 | true | 9.50 | B |
| רחובות (il-31.8953-34.8106) | flat | 1280 | synagogue | il-synagogue-31.89576-34.8168 | זה השער לה | 0.59 | own | near | 9 (HALL_M default (legacy 9m)) | none | 567.6–578.6 | 398.8–1072.6 | true | 9.50 | B |
| קרית עקרון (il-31.8608-34.8233) | flat | 375 | synagogue | il-synagogue-31.8599-34.82318 | הר שבטי ישראל | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 156.5–243.9 | true | 9.50 | B |
| קרית עקרון (il-31.8608-34.8233) | flat | 1280 | synagogue | il-synagogue-31.8599-34.82318 | הר שבטי ישראל | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 534.3–832.5 | true | 9.50 | B |
| מזכרת בתיה (il-31.8514-34.8412) | flat | 375 | synagogue | il-synagogue-31.85517-34.84083 | בית הכנסת הגדול מזכרת בתיה | 0.42 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 116.2–235.7 | true | 9.50 | B |
| מזכרת בתיה (il-31.8514-34.8412) | flat | 1280 | synagogue | il-synagogue-31.85517-34.84083 | בית הכנסת הגדול מזכרת בתיה | 0.42 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 396.7–804.5 | true | 9.50 | B |
| נס ציונה (il-31.9296-34.7991) | flat | 375 | synagogue | il-synagogue-31.9269-34.79572 | בית הכנסת הגדול | 0.43 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.1–205.1 | 105.1–279.3 | true | 9.50 | B |
| נס ציונה (il-31.9296-34.7991) | flat | 1280 | synagogue | il-synagogue-31.9269-34.79572 | בית הכנסת הגדול | 0.43 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.6–686.6 | 358.6–953.4 | true | 9.50 | B |
| ראשון לציון (il-31.9636-34.8101) | flat | 375 | synagogue | il-synagogue-31.96435-34.80776 | בית הכנסת הגדול | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 117.9–355.1 | true | 9.50 | B |
| ראשון לציון (il-31.9636-34.8101) | flat | 1280 | synagogue | il-synagogue-31.96435-34.80776 | בית הכנסת הגדול | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 402.3–1212.0 | true | 9.50 | B |
| מצליח (il-31.9062-34.8718) | flat | 375 | synagogue | il-synagogue-31.90362-34.87718 | קראים | 0.58 | own | near | 9 (HALL_M default (legacy 9m)) | none | 164.4–175.4 | 75.0–242.7 | true | 9.50 | B |
| מצליח (il-31.9062-34.8718) | flat | 1280 | synagogue | il-synagogue-31.90362-34.87718 | קראים | 0.58 | own | near | 9 (HALL_M default (legacy 9m)) | none | 574.3–585.3 | 255.9–828.5 | true | 9.50 | B |
| זיתן (il-31.9754-34.8914) | flat | 375 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 2.60 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_348:79:25 (לוד) | 165.7–168.5 | 98.2–228.7 | true | 3.32 | C |
| זיתן (il-31.9754-34.8914) | flat | 1280 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 2.60 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_348:79:25 (לוד) | 569.0–571.7 | 335.2–780.6 | true | 3.32 | C |
| אחיסמך (il-31.9356-34.9081) | flat | 375 | synagogue | il-synagogue-31.93899-34.90168 | בית הכנסת הגדול תורה ותפילה | 0.71 | own | near | 9 (HALL_M default (legacy 9m)) | none | 208.0–219.0 | 143.5–258.6 | true | 9.50 | B |
| אחיסמך (il-31.9356-34.9081) | flat | 1280 | synagogue | il-synagogue-31.93899-34.90168 | בית הכנסת הגדול תורה ותפילה | 0.71 | own | near | 9 (HALL_M default (legacy 9m)) | none | 723.1–734.1 | 490.0–882.8 | true | 9.50 | B |
| בניין אגף ההנדסה רמת גן (il-32.0817-34.8130) | flat | 375 | synagogue | il-synagogue-32.08155-34.81205 | בית הכנסת האיטלקי | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 132.9–245.6 | true | 9.50 | B |
| בניין אגף ההנדסה רמת גן (il-32.0817-34.8130) | flat | 1280 | synagogue | il-synagogue-32.08155-34.81205 | בית הכנסת האיטלקי | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 453.5–838.2 | true | 9.50 | B |
| בני ברק (il-32.0874-34.8324) | flat | 375 | synagogue | il-synagogue-32.08601-34.83558 | תפארת צבי איצקוביץ | 0.33 | own | near | 9 (HALL_M default (legacy 9m)) | none | 169.4–180.4 | 119.7–233.4 | true | 9.50 | B |
| בני ברק (il-32.0874-34.8324) | flat | 1280 | synagogue | il-synagogue-32.08601-34.83558 | תפארת צבי איצקוביץ | 0.33 | own | near | 9 (HALL_M default (legacy 9m)) | none | 591.6–602.6 | 408.6–796.7 | true | 9.50 | B |
| אור יהודה (il-32.0270-34.8630) | flat | 375 | synagogue | il-synagogue-32.0284-34.85734 | בית כנסת נוה-סביון | 0.55 | own | near | 9 (HALL_M default (legacy 9m)) | none | 198.4–209.4 | 160.2–302.7 | true | 9.50 | B |
| אור יהודה (il-32.0270-34.8630) | flat | 375 | minaret | il-minaret-32.03092-34.88901 | מסגד עבאסייה | 2.49 | beyond | near | 9 (HALL_M default (legacy 30m)) | 320_348:71:14 (יהוד מונוסון) | 106.2–109.6 | 160.2–302.7 | false | 4.02 | A |
| אור יהודה (il-32.0270-34.8630) | flat | 1280 | synagogue | il-synagogue-32.0284-34.85734 | בית כנסת נוה-סביון | 0.55 | own | near | 9 (HALL_M default (legacy 9m)) | none | 690.4–701.4 | 546.8–1033.2 | true | 9.50 | B |
| אור יהודה (il-32.0270-34.8630) | flat | 1280 | minaret | il-minaret-32.03092-34.88901 | מסגד עבאסייה | 2.49 | beyond | near | 9 (HALL_M default (legacy 30m)) | 320_348:71:14 (יהוד מונוסון) | 366.6–370.0 | 546.8–1033.2 | false | 4.02 | A |
| קריית אונו (il-32.0592-34.8594) | flat | 375 | minaret | il-minaret-32.03092-34.88901 | מסגד עבאסייה | 4.20 | beyond | near | 9 (HALL_M default (legacy 30m)) | 320_348:71:14 (יהוד מונוסון) | 109.5–112.2 | 147.3–265.5 | false | 3.34 | A |
| קריית אונו (il-32.0592-34.8594) | flat | 1280 | minaret | il-minaret-32.03092-34.88901 | מסגד עבאסייה | 4.20 | beyond | near | 9 (HALL_M default (legacy 30m)) | 320_348:71:14 (יהוד מונוסון) | 377.0–379.7 | 502.8–906.3 | false | 3.34 | A |
| רעננה (il-32.1860-34.8678) | flat | 375 | synagogue | il-synagogue-32.17973-34.8768 | בית הכנסת הגדול רעננה | 1.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 154.9–165.9 | 99.3–281.1 | true | 9.50 | B |
| רעננה (il-32.1860-34.8678) | flat | 1280 | synagogue | il-synagogue-32.17973-34.8768 | בית הכנסת הגדול רעננה | 1.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 541.9–552.9 | 339.1–959.4 | true | 9.50 | B |
| הוד השרון (il-32.1562-34.8930) | flat | 375 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 8.93 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 354.0–360.6 | 65.8–277.8 | false | 8.00 | D |
| הוד השרון (il-32.1562-34.8930) | flat | 1280 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 8.93 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1216.4–1223.0 | 224.4–948.3 | false | 8.00 | D |
| רמות השבים (il-32.1662-34.8860) | flat | 375 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 7.92 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 345.8–352.4 | 164.0–222.9 | false | 8.00 | D |
| רמות השבים (il-32.1662-34.8860) | flat | 1280 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 7.92 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1188.2–1194.8 | 559.9–760.7 | false | 8.00 | D |
| כפר מל"ל (il-32.1671-34.8935) | flat | 375 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 8.57 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 342.7–349.3 | 157.0–221.9 | false | 8.00 | D |
| כפר מל"ל (il-32.1671-34.8935) | flat | 1280 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 8.57 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1177.7–1184.3 | 536.0–757.5 | false | 8.00 | D |
| גני עם (il-32.1514-34.9017) | flat | 375 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 9.89 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 355.5–362.1 | 135.2–207.6 | false | 8.00 | D |
| גני עם (il-32.1514-34.9017) | flat | 1280 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 9.89 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1221.3–1227.9 | 461.5–708.4 | false | 8.00 | D |
| צופית (il-32.1918-34.9231) | flat | 375 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 11.05 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 315.8–322.4 | 127.2–226.7 | false | 8.00 | D |
| צופית (il-32.1918-34.9231) | flat | 1280 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 11.05 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1085.8–1092.4 | 434.2–773.8 | false | 8.00 | D |
| אלישמע (il-32.1520-34.9279) | flat | 375 | minaret | il-minaret-32.15465-34.9497 | (unnamed) | 2.07 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_349:39:26 (ג'לג'וליה) | 95.3–99.5 | 141.9–246.2 | false | 5.13 | A |
| אלישמע (il-32.1520-34.9279) | flat | 375 | minaret | il-minaret-32.15574-34.95406 | (unnamed) | 2.50 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_349:43:26 (ג'לג'וליה) | 73.8–78.2 | 141.9–246.2 | false | 5.29 | A |
| אלישמע (il-32.1520-34.9279) | flat | 375 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 12.16 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 348.0–354.6 | 141.9–246.2 | false | 8.00 | D |
| אלישמע (il-32.1520-34.9279) | flat | 1280 | minaret | il-minaret-32.15465-34.9497 | (unnamed) | 2.07 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_349:39:26 (ג'לג'וליה) | 330.2–334.5 | 484.3–840.5 | false | 5.13 | A |
| אלישמע (il-32.1520-34.9279) | flat | 1280 | minaret | il-minaret-32.15574-34.95406 | (unnamed) | 2.50 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_349:43:26 (ג'לג'וליה) | 257.2–261.6 | 484.3–840.5 | false | 5.29 | A |
| אלישמע (il-32.1520-34.9279) | flat | 1280 | minaret | il-minaret-32.18783-34.80582 | מסגד סידנא עלי | 12.16 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1195.7–1202.3 | 484.3–840.5 | false | 8.00 | D |
| יסודות (il-31.8149-34.8662) | flat | 375 | synagogue | il-synagogue-31.81508-34.86655 | בית הכנסת המרכזי יסודות | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 137.5–258.0 | true | 9.50 | B |
| יסודות (il-31.8149-34.8662) | flat | 1280 | synagogue | il-synagogue-31.81508-34.86655 | בית הכנסת המרכזי יסודות | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 469.4–880.6 | true | 9.50 | B |
| נצר חזני (il-31.8216-34.8625) | flat | 375 | synagogue | il-synagogue-31.82208-34.86283 | בית הכנסת אור יצחק | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 169.5–257.6 | true | 9.50 | B |
| נצר חזני (il-31.8216-34.8625) | flat | 1280 | synagogue | il-synagogue-31.82208-34.86283 | בית הכנסת אור יצחק | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 578.6–879.3 | true | 9.50 | B |
| יד רמב"ם (il-31.8994-34.9008) | flat | 375 | minaret | il-minaret-31.92913-34.73364 | נבי רובין | 16.12 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 337.0–343.6 | 92.8–252.4 | false | 8.00 | D |
| יד רמב"ם (il-31.8994-34.9008) | flat | 375 | synagogue | il-synagogue-31.89576-34.8168 | זה השער לה | 7.94 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 313.6–322.8 | 92.8–252.4 | false | 8.00 | D |
| יד רמב"ם (il-31.8994-34.9008) | flat | 1280 | minaret | il-minaret-31.92913-34.73364 | נבי רובין | 16.12 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1158.4–1165.0 | 316.8–861.6 | false | 8.00 | D |
| יד רמב"ם (il-31.8994-34.9008) | flat | 1280 | synagogue | il-synagogue-31.89576-34.8168 | זה השער לה | 7.94 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1081.4–1090.7 | 316.8–861.6 | false | 8.00 | D |
| עזריה (il-31.8905-34.9116) | flat | 375 | synagogue | il-synagogue-31.9269-34.79572 | בית הכנסת הגדול | 11.66 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 348.4–357.6 | 81.2–255.7 | false | 8.00 | D |
| עזריה (il-31.8905-34.9116) | flat | 1280 | synagogue | il-synagogue-31.9269-34.79572 | בית הכנסת הגדול | 11.66 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1200.3–1209.6 | 277.3–872.9 | false | 8.00 | D |
| בית חשמונאי (il-31.8880-34.9190) | flat | 375 | synagogue | il-synagogue-31.9269-34.79572 | בית הכנסת הגדול | 12.42 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 348.5–357.8 | 135.8–215.4 | false | 8.00 | D |
| בית חשמונאי (il-31.8880-34.9190) | flat | 1280 | synagogue | il-synagogue-31.9269-34.79572 | בית הכנסת הגדול | 12.42 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1200.7–1210.0 | 463.6–735.2 | false | 8.00 | D |
| משמר איילון (il-31.8719-34.9448) | flat | 375 | synagogue | il-synagogue-31.89042-34.81733 | בית כנסת תימני | 12.21 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 332.4–341.7 | 84.7–208.1 | false | 8.00 | D |
| משמר איילון (il-31.8719-34.9448) | flat | 1280 | synagogue | il-synagogue-31.89042-34.81733 | בית כנסת תימני | 12.21 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1145.9–1155.2 | 289.1–710.5 | false | 8.00 | D |
| Kfar Bin Nun (il-31.8625-34.9472) | flat | 375 | synagogue | il-synagogue-31.89042-34.81733 | בית כנסת תימני | 12.65 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 339.3–348.5 | 114.3–206.4 | false | 8.00 | D |
| Kfar Bin Nun (il-31.8625-34.9472) | flat | 1280 | synagogue | il-synagogue-31.89042-34.81733 | בית כנסת תימני | 12.65 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1169.2–1178.4 | 390.0–704.7 | false | 8.00 | D |
| שעלבים (il-31.8700-34.9839) | flat | 375 | synagogue | il-synagogue-31.86905-34.98188 | בית הכנסת שעלבים | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 127.8–285.3 | true | 9.50 | B |
| שעלבים (il-31.8700-34.9839) | flat | 375 | synagogue | il-synagogue-31.86954-34.98559 | ישיבת ההסדר שעלבים | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 127.8–285.3 | true | 9.50 | B |
| שעלבים (il-31.8700-34.9839) | flat | 1280 | synagogue | il-synagogue-31.86905-34.98188 | בית הכנסת שעלבים | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 436.1–973.8 | true | 9.50 | B |
| שעלבים (il-31.8700-34.9839) | flat | 1280 | synagogue | il-synagogue-31.86954-34.98559 | ישיבת ההסדר שעלבים | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 436.1–973.8 | true | 9.50 | B |
| נוף איילון (il-31.8705-34.9897) | flat | 375 | synagogue | il-synagogue-31.87138-34.99328 | בית הכנסת זכור לאברהם | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 167.9–178.9 | 107.4–198.0 | true | 9.50 | B |
| נוף איילון (il-31.8705-34.9897) | flat | 1280 | synagogue | il-synagogue-31.87138-34.99328 | בית הכנסת זכור לאברהם | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 586.3–597.3 | 366.6–675.8 | true | 9.50 | B |
| גזר (il-31.8770-34.9209) | flat | 375 | synagogue | il-synagogue-31.87668-34.91999 | בית כנסת ברכת שלום | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 153.3–213.1 | true | 9.50 | B |
| גזר (il-31.8770-34.9209) | flat | 375 | synagogue | il-synagogue-31.86954-34.98559 | ישיבת ההסדר שעלבים | 6.17 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 59.4–68.7 | 153.3–213.1 | false | 8.00 | D |
| גזר (il-31.8770-34.9209) | flat | 1280 | synagogue | il-synagogue-31.87668-34.91999 | בית כנסת ברכת שלום | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 523.3–727.5 | true | 9.50 | B |
| גזר (il-31.8770-34.9209) | flat | 1280 | synagogue | il-synagogue-31.86954-34.98559 | ישיבת ההסדר שעלבים | 6.17 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 214.1–223.4 | 523.3–727.5 | false | 8.00 | D |
| מודיעין-מכבים-רעות (il-31.9086-35.0069) | flat | 375 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 11.28 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 358.2–364.8 | 118.4–334.2 | false | 8.00 | D |
| מודיעין-מכבים-רעות (il-31.9086-35.0069) | flat | 1280 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 11.28 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1230.5–1237.1 | 404.2–1140.8 | false | 8.00 | D |
| בית חורון (il-31.8782-35.1268) | flat | 375 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 8.14 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 18.2–24.7 | 154.8–224.1 | false | 8.00 | D |
| בית חורון (il-31.8782-35.1268) | flat | 1280 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 8.14 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 69.9–76.5 | 528.5–764.8 | false | 8.00 | D |
| רמת מגרון (il-31.8861-35.2694) | flat | 375 | minaret | il-minaret-31.85678-35.2631 | Al Atqya' Mosque | 3.32 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:50:27 (ג'בע) | 202.7–205.8 | 158.2–173.4 | false | 3.72 | A |
| רמת מגרון (il-31.8861-35.2694) | flat | 375 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 6.19 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 347.5–354.1 | 158.2–173.4 | false | 8.00 | D |
| רמת מגרון (il-31.8861-35.2694) | flat | 1280 | minaret | il-minaret-31.85678-35.2631 | Al Atqya' Mosque | 3.32 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:50:27 (ג'בע) | 695.7–698.8 | 540.1–632.1 | false | 3.72 | A |
| רמת מגרון (il-31.8861-35.2694) | flat | 1280 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 6.19 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1194.0–1200.6 | 540.1–632.1 | false | 8.00 | D |
| מצפה יריחו (il-31.8156-35.3943) | flat | 375 | synagogue | il-synagogue-31.8121-35.39333 | ישיבת מצפה יריחו מאור טוביה | 0.39 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 125.1–283.1 | true | 9.50 | B |
| מצפה יריחו (il-31.8156-35.3943) | flat | 1280 | synagogue | il-synagogue-31.8121-35.39333 | ישיבת מצפה יריחו מאור טוביה | 0.39 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 426.9–966.4 | true | 9.50 | B |
| כפר אדומים (il-31.8253-35.3352) | flat | 375 | minaret | il-minaret-31.77787-35.22965 | מסגד עומר | 11.28 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 277.5–284.1 | 129.3–218.0 | false | 8.00 | D |
| כפר אדומים (il-31.8253-35.3352) | flat | 1280 | minaret | il-minaret-31.77787-35.22965 | מסגד עומר | 11.28 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 955.0–961.6 | 441.3–744.1 | false | 8.00 | D |
| מעלה מכמש (il-31.8789-35.3062) | flat | 375 | synagogue | il-synagogue-31.87729-35.30592 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 165.3–219.6 | true | 9.50 | B |
| מעלה מכמש (il-31.8789-35.3062) | flat | 375 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 9.74 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 344.3–350.8 | 165.3–219.6 | false | 8.00 | D |
| מעלה מכמש (il-31.8789-35.3062) | flat | 1280 | synagogue | il-synagogue-31.87729-35.30592 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 564.1–749.7 | true | 9.50 | B |
| מעלה מכמש (il-31.8789-35.3062) | flat | 1280 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 9.74 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1183.0–1189.6 | 564.1–749.7 | false | 8.00 | D |
| שוהם (il-32.0005-34.9465) | flat | 375 | synagogue | il-synagogue-32.00177-34.94218 | שמחת מנשה | 0.44 | own | near | 9 (HALL_M default (legacy 9m)) | none | 197.9–208.9 | 104.8–219.6 | true | 9.50 | B |
| שוהם (il-32.0005-34.9465) | flat | 1280 | synagogue | il-synagogue-32.00177-34.94218 | שמחת מנשה | 0.44 | own | near | 9 (HALL_M default (legacy 9m)) | none | 688.7–699.7 | 357.7–749.6 | true | 9.50 | B |
| ברקת (il-32.0189-34.9438) | flat | 375 | synagogue | il-synagogue-32.01768-34.94412 | בית כנסת ברקת | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 106.6–277.5 | true | 9.50 | B |
| ברקת (il-32.0189-34.9438) | flat | 1280 | synagogue | il-synagogue-32.01768-34.94412 | בית כנסת ברקת | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 364.0–947.1 | true | 9.50 | B |
| לפיד (il-31.9175-35.0319) | flat | 375 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 13.11 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 345.5–352.1 | 166.3–229.1 | false | 8.00 | D |
| לפיד (il-31.9175-35.0319) | flat | 1280 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 13.11 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1187.2–1193.8 | 567.7–781.8 | false | 8.00 | D |
| חשמונאים (il-31.9312-35.0224) | flat | 375 | synagogue | il-synagogue-31.92898-35.0272 | ישיבת מערבא | 0.52 | own | near | 9 (HALL_M default (legacy 9m)) | none | 156.1–167.1 | 144.2–205.0 | true | 9.50 | B |
| חשמונאים (il-31.9312-35.0224) | flat | 375 | synagogue | il-synagogue-31.92948-35.02155 | בית כנסת יד משה | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 144.2–205.0 | true | 9.50 | B |
| חשמונאים (il-31.9312-35.0224) | flat | 375 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 11.85 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 337.0–343.5 | 144.2–205.0 | false | 8.00 | D |
| חשמונאים (il-31.9312-35.0224) | flat | 1280 | synagogue | il-synagogue-31.92898-35.0272 | ישיבת מערבא | 0.52 | own | near | 9 (HALL_M default (legacy 9m)) | none | 546.2–557.2 | 492.3–699.7 | true | 9.50 | B |
| חשמונאים (il-31.9312-35.0224) | flat | 1280 | synagogue | il-synagogue-31.92948-35.02155 | בית כנסת יד משה | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 492.3–699.7 | true | 9.50 | B |
| חשמונאים (il-31.9312-35.0224) | flat | 1280 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 11.85 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1158.1–1164.7 | 492.3–699.7 | false | 8.00 | D |
| גני מודיעין (il-31.9295-35.0173) | flat | 375 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 11.43 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 339.0–345.6 | 164.3–223.6 | false | 8.00 | D |
| גני מודיעין (il-31.9295-35.0173) | flat | 1280 | minaret | il-minaret-31.95297-34.89942 | מסגד אל-עומרי | 11.43 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1165.2–1171.8 | 560.7–763.3 | false | 8.00 | D |
| טלמון (il-31.9394-35.1323) | flat | 375 | synagogue | il-synagogue-31.93927-35.13187 | בית כנסת ספרדי | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 130.4–218.4 | true | 9.50 | B |
| טלמון (il-31.9394-35.1323) | flat | 375 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 8.48 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 44.3–53.5 | 130.4–218.4 | false | 8.00 | D |
| טלמון (il-31.9394-35.1323) | flat | 1280 | synagogue | il-synagogue-31.93927-35.13187 | בית כנסת ספרדי | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 444.9–745.5 | true | 9.50 | B |
| טלמון (il-31.9394-35.1323) | flat | 1280 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 8.48 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 162.3–171.6 | 444.9–745.5 | false | 8.00 | D |
| נריה (il-31.9543-35.1258) | flat | 375 | synagogue | il-synagogue-31.95392-35.12558 | בית כנסת מרכזי בקבע | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 157.8–216.8 | true | 9.50 | B |
| נריה (il-31.9543-35.1258) | flat | 375 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 9.18 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 60.1–69.3 | 157.8–216.8 | false | 8.00 | D |
| נריה (il-31.9543-35.1258) | flat | 1280 | synagogue | il-synagogue-31.95392-35.12558 | בית כנסת מרכזי בקבע | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 538.5–740.2 | true | 9.50 | B |
| נריה (il-31.9543-35.1258) | flat | 1280 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 9.18 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 216.2–225.5 | 538.5–740.2 | false | 8.00 | D |
| זית רענן (il-31.9562-35.1175) | flat | 375 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 9.99 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 60.9–70.2 | 171.9–181.5 | false | 8.00 | D |
| זית רענן (il-31.9562-35.1175) | flat | 375 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 10.27 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 100.7–107.3 | 171.9–181.5 | false | 8.00 | D |
| זית רענן (il-31.9562-35.1175) | flat | 1280 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 9.99 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 219.2–228.4 | 586.9–633.9 | false | 8.00 | D |
| זית רענן (il-31.9562-35.1175) | flat | 1280 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 10.27 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 351.6–358.1 | 586.9–633.9 | false | 8.00 | D |
| עטרת (il-32.0005-35.1766) | flat | 375 | synagogue | il-synagogue-32.00106-35.17581 | בית הכנסת הספרדי | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 161.4–212.9 | true | 9.50 | B |
| עטרת (il-32.0005-35.1766) | flat | 1280 | synagogue | il-synagogue-32.00106-35.17581 | בית הכנסת הספרדי | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 550.8–726.9 | true | 9.50 | B |
| עוז ציון (il-31.9082-35.2505) | flat | 375 | minaret | il-minaret-31.89272-35.20815 | مسجد الرحمن | 4.35 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:6:44 (אל בירה) | 318.1–321.9 | 142.2–182.5 | false | 4.63 | A |
| עוז ציון (il-31.9082-35.2505) | flat | 1280 | minaret | il-minaret-31.89272-35.20815 | مسجد الرحمن | 4.35 | beyond | near | 9 (HALL_M default (legacy 30m)) | 318_352:6:44 (אל בירה) | 1090.2–1094.0 | 485.4–634.3 | false | 4.63 | A |
| אור אהוביה (il-31.9358-35.2715) | flat | 375 | minaret | il-minaret-31.90138-35.25567 | Burqa Mosque | 4.11 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_352:44:0 (בורקא) | 221.4–223.7 | none | false | 2.84 | A |
| אור אהוביה (il-31.9358-35.2715) | flat | 375 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 7.01 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 273.9–280.5 | none | false | 8.00 | D |
| אור אהוביה (il-31.9358-35.2715) | flat | 1280 | minaret | il-minaret-31.90138-35.25567 | Burqa Mosque | 4.11 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_352:44:0 (בורקא) | 758.5–760.9 | none | false | 2.84 | A |
| אור אהוביה (il-31.9358-35.2715) | flat | 1280 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 7.01 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 942.8–949.4 | none | false | 8.00 | D |
| עפרה (il-31.9535-35.2605) | flat | 375 | minaret | il-minaret-31.95314-35.25185 | Mosque | 0.81 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_352:41:25 (עין יברוד) | 232.1–237.6 | 152.5–237.7 | true | 6.68 | C |
| עפרה (il-31.9535-35.2605) | flat | 1280 | minaret | il-minaret-31.95314-35.25185 | Mosque | 0.81 | beyond | near | 9 (HALL_M default (legacy 30m)) | 319_352:41:25 (עין יברוד) | 798.8–804.3 | 520.5–811.4 | true | 6.68 | C |
| רימונים (il-31.9345-35.3401) | flat | 375 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 11.17 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 324.8–334.1 | 162.9–209.0 | false | 8.00 | D |
| רימונים (il-31.9345-35.3401) | flat | 375 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 12.97 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 296.6–303.2 | 162.9–209.0 | false | 8.00 | D |
| רימונים (il-31.9345-35.3401) | flat | 1280 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 11.17 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1119.8–1129.1 | 556.1–713.4 | false | 8.00 | D |
| רימונים (il-31.9345-35.3401) | flat | 1280 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 12.97 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1020.3–1026.9 | 556.1–713.4 | false | 8.00 | D |
| מעלה שלמה (il-31.9494-35.3440) | flat | 375 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 11.52 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 312.2–321.5 | none | false | 8.00 | D |
| מעלה שלמה (il-31.9494-35.3440) | flat | 375 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 13.84 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 287.2–293.8 | none | false | 8.00 | D |
| מעלה שלמה (il-31.9494-35.3440) | flat | 1280 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 11.52 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1076.9–1086.2 | 645.8–663.9 | false | 8.00 | D |
| מעלה שלמה (il-31.9494-35.3440) | flat | 1280 | minaret | il-minaret-31.90408-35.20741 | Jamal Abdel Nasser Mosque | 13.84 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 988.3–994.9 | 645.8–663.9 | false | 8.00 | D |
| אעירה שחר (il-31.9508-35.3691) | flat | 375 | synagogue | il-synagogue-31.94994-35.36943 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | none | false | 9.50 | B |
| אעירה שחר (il-31.9508-35.3691) | flat | 375 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 13.89 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 312.2–321.5 | none | false | 8.00 | D |
| אעירה שחר (il-31.9508-35.3691) | flat | 1280 | synagogue | il-synagogue-31.94994-35.36943 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | none | false | 9.50 | B |
| אעירה שחר (il-31.9508-35.3691) | flat | 1280 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 13.89 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1077.0–1086.2 | none | false | 8.00 | D |
| כוכב השחר (il-31.9603-35.3495) | flat | 375 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 12.18 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 303.9–313.2 | 167.6–227.6 | false | 8.00 | D |
| כוכב השחר (il-31.9603-35.3495) | flat | 1280 | synagogue | il-synagogue-31.94255-35.22212 | ישיבת בית אל | 12.18 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1048.6–1057.9 | 571.9–776.9 | false | 8.00 | D |
| מבואות יריחו (il-31.9080-35.4171) | flat | 375 | synagogue | il-synagogue-31.90796-35.4174 | (unnamed) | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 154.3–203.8 | true | 9.50 | B |
| מבואות יריחו (il-31.9080-35.4171) | flat | 1280 | synagogue | il-synagogue-31.90796-35.4174 | (unnamed) | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 526.7–695.6 | true | 9.50 | B |
| אורנית (il-32.1309-34.9920) | flat | 375 | minaret | il-minaret-32.11099-34.97177 | (unnamed) | 2.92 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_349:57:5 (כפר קאסם) | 234.0–236.5 | 121.2–214.5 | false | 2.98 | A |
| אורנית (il-32.1309-34.9920) | flat | 375 | synagogue | il-synagogue-32.13011-34.99527 | אוהל אברהם | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 168.8–179.8 | 121.2–214.5 | true | 9.50 | B |
| אורנית (il-32.1309-34.9920) | flat | 1280 | minaret | il-minaret-32.11099-34.97177 | (unnamed) | 2.92 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_349:57:5 (כפר קאסם) | 801.8–804.2 | 413.6–732.1 | false | 2.98 | A |
| אורנית (il-32.1309-34.9920) | flat | 1280 | synagogue | il-synagogue-32.13011-34.99527 | אוהל אברהם | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 589.5–600.5 | 413.6–732.1 | true | 9.50 | B |
| בית אריה (il-32.0341-35.0502) | flat | 375 | synagogue | il-synagogue-32.03843-35.05089 | בית הכנסת בית אריה | 0.48 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 136.0–241.6 | true | 9.50 | B |
| בית אריה (il-32.0341-35.0502) | flat | 1280 | synagogue | il-synagogue-32.03843-35.05089 | בית הכנסת בית אריה | 0.48 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 464.1–824.7 | true | 9.50 | B |
| פדואל (il-32.0618-35.0532) | flat | 375 | synagogue | il-synagogue-32.0629-35.05359 | מאור יוסף | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 165.3–259.6 | true | 9.50 | B |
| פדואל (il-32.0618-35.0532) | flat | 1280 | synagogue | il-synagogue-32.0629-35.05359 | מאור יוסף | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 564.2–886.0 | true | 9.50 | B |
| אריאל (il-32.1061-35.1851) | flat | 375 | synagogue | il-synagogue-32.1069-35.1874 | שבות אריאל ויהושע בן נון | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 86.4–272.4 | true | 9.50 | B |
| אריאל (il-32.1061-35.1851) | flat | 1280 | synagogue | il-synagogue-32.1069-35.1874 | שבות אריאל ויהושע בן נון | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 294.8–929.8 | true | 9.50 | B |
| מעלה לבונה (il-32.0550-35.2403) | flat | 375 | synagogue | il-synagogue-32.05434-35.23921 | בית כנסת מעלה לבונה | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 127.3–204.2 | true | 9.50 | B |
| מעלה לבונה (il-32.0550-35.2403) | flat | 1280 | synagogue | il-synagogue-32.05434-35.23921 | בית כנסת מעלה לבונה | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 434.5–697.0 | true | 9.50 | B |
| גבעת הראל (il-32.0596-35.2723) | flat | 375 | minaret | il-minaret-32.03671-35.28552 | مسجد ابو بكر الصديق | 2.83 | beyond | near | 9 (HALL_M default (legacy 30m)) | 320_352:68:17 (תורמוסעייא) | 158.7–160.8 | 136.8–226.1 | true | 2.64 | C |
| גבעת הראל (il-32.0596-35.2723) | flat | 375 | synagogue | il-synagogue-32.05925-35.27247 | בית כנסת גבעת הראל | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 136.8–226.1 | true | 9.50 | B |
| גבעת הראל (il-32.0596-35.2723) | flat | 1280 | minaret | il-minaret-32.03671-35.28552 | مسجد ابو بكر الصديق | 2.83 | beyond | near | 9 (HALL_M default (legacy 30m)) | 320_352:68:17 (תורמוסעייא) | 544.2–546.3 | 466.9–771.8 | true | 2.64 | C |
| גבעת הראל (il-32.0596-35.2723) | flat | 1280 | synagogue | il-synagogue-32.05925-35.27247 | בית כנסת גבעת הראל | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 466.9–771.8 | true | 9.50 | B |
| עלי (il-32.0695-35.2625) | flat | 375 | minaret | il-minaret-32.03671-35.28552 | مسجد ابو بكر الصديق | 4.24 | beyond | near | 9 (HALL_M default (legacy 30m)) | 320_352:68:17 (תורמוסעייא) | 129.1–131.5 | 144.7–254.7 | false | 2.91 | A |
| עלי (il-32.0695-35.2625) | flat | 1280 | minaret | il-minaret-32.03671-35.28552 | مسجد ابو بكر الصديق | 4.24 | beyond | near | 9 (HALL_M default (legacy 30m)) | 320_352:68:17 (תורמוסעייא) | 443.5–445.9 | 494.0–869.5 | false | 2.91 | A |
| פלגי מים (il-32.0880-35.2747) | flat | 375 | synagogue | il-synagogue-32.0875-35.27397 | בית כנסת פלגי מים | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | none | false | 9.50 | B |
| פלגי מים (il-32.0880-35.2747) | flat | 1280 | synagogue | il-synagogue-32.0875-35.27397 | בית כנסת פלגי מים | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 607.6–666.7 | false | 9.50 | B |
| מגדלים (il-32.0899-35.3423) | flat | 375 | synagogue | il-synagogue-32.09003-35.3423 | (unnamed) | 0.02 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 140.7–199.3 | true | 9.50 | B |
| מגדלים (il-32.0899-35.3423) | flat | 1280 | synagogue | il-synagogue-32.09003-35.3423 | (unnamed) | 0.02 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 480.2–680.4 | true | 9.50 | B |
| נירית (il-32.1466-34.9844) | flat | 375 | synagogue | il-synagogue-32.146-34.98618 | בית כנסת נירית | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 161.5–217.2 | true | 9.50 | B |
| נירית (il-32.1466-34.9844) | flat | 1280 | synagogue | il-synagogue-32.146-34.98618 | בית כנסת נירית | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 551.1–741.4 | true | 9.50 | B |
| אלקנה (il-32.1116-35.0355) | flat | 375 | synagogue | il-synagogue-32.11042-35.03747 | בית הכנסת תפארת שלום | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 157.5–242.1 | true | 9.50 | B |
| אלקנה (il-32.1116-35.0355) | flat | 1280 | synagogue | il-synagogue-32.11042-35.03747 | בית הכנסת תפארת שלום | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 537.7–826.3 | true | 9.50 | B |
| עץ אפרים (il-32.1192-35.0469) | flat | 375 | synagogue | il-synagogue-32.11959-35.04762 | 3 Synagogue | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 160.2–219.3 | true | 9.50 | B |
| עץ אפרים (il-32.1192-35.0469) | flat | 1280 | synagogue | il-synagogue-32.11959-35.04762 | 3 Synagogue | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 546.9–748.4 | true | 9.50 | B |
| יקיר (il-32.1494-35.1145) | flat | 375 | minaret | il-minaret-32.1311-35.13878 | Deir Istiya Small Mosque | 3.06 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_351:31:14 (דיר איסתיא) | 101.6–105.5 | 166.1–221.8 | false | 4.72 | A |
| יקיר (il-32.1494-35.1145) | flat | 375 | synagogue | il-synagogue-32.14963-35.11448 | בית כנסת יקיר | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 166.1–221.8 | true | 9.50 | B |
| יקיר (il-32.1494-35.1145) | flat | 1280 | minaret | il-minaret-32.1311-35.13878 | Deir Istiya Small Mosque | 3.06 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_351:31:14 (דיר איסתיא) | 351.4–355.3 | 567.0–756.9 | false | 4.72 | A |
| יקיר (il-32.1494-35.1145) | flat | 1280 | synagogue | il-synagogue-32.14963-35.11448 | בית כנסת יקיר | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 567.0–756.9 | true | 9.50 | B |
| אלפי מנשה (il-32.1731-35.0158) | flat | 375 | synagogue | il-synagogue-32.17341-35.01407 | בית כנסת ארזי הלבנון | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 162.9–263.7 | true | 9.50 | B |
| אלפי מנשה (il-32.1731-35.0158) | flat | 375 | minaret | il-minaret-32.20448-35.13156 | Mosque | 11.44 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 22.5–29.1 | 162.9–263.7 | false | 8.00 | D |
| אלפי מנשה (il-32.1731-35.0158) | flat | 1280 | synagogue | il-synagogue-32.17341-35.01407 | בית כנסת ארזי הלבנון | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 556.1–900.2 | true | 9.50 | B |
| אלפי מנשה (il-32.1731-35.0158) | flat | 1280 | minaret | il-minaret-32.20448-35.13156 | Mosque | 11.44 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 84.7–91.3 | 556.1–900.2 | false | 8.00 | D |
| עמנואל (il-32.1619-35.1361) | flat | 375 | synagogue | il-synagogue-32.16234-35.14003 | חסידי חוסט | 0.37 | own | near | 9 (HALL_M default (legacy 9m)) | none | 169.7–180.7 | 102.6–204.3 | true | 9.50 | B |
| עמנואל (il-32.1619-35.1361) | flat | 1280 | synagogue | il-synagogue-32.16234-35.14003 | חסידי חוסט | 0.37 | own | near | 9 (HALL_M default (legacy 9m)) | none | 592.4–603.4 | 350.2–697.4 | true | 9.50 | B |
| קומי אורי (il-32.1581-35.2368) | flat | 375 | synagogue | il-synagogue-32.15754-35.23638 | בית מדרש | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | none | false | 9.50 | B |
| קומי אורי (il-32.1581-35.2368) | flat | 1280 | synagogue | il-synagogue-32.15754-35.23638 | בית מדרש | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | none | false | 9.50 | B |
| שכונת הקראוונים (il-32.1691-35.2393) | flat | 375 | synagogue | il-synagogue-32.16703-35.23832 | בית הכנסת המרכזי | 0.25 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 172.3–200.1 | true | 9.50 | B |
| שכונת הקראוונים (il-32.1691-35.2393) | flat | 1280 | synagogue | il-synagogue-32.16703-35.23832 | בית הכנסת המרכזי | 0.25 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 588.1–682.9 | true | 9.50 | B |
| שלהבת-יה (il-32.1723-35.2233) | flat | 375 | synagogue | il-synagogue-32.1718-35.22362 | שלהבת-יה | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | none | false | 9.50 | B |
| שלהבת-יה (il-32.1723-35.2233) | flat | 1280 | synagogue | il-synagogue-32.1718-35.22362 | שלהבת-יה | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | none | false | 9.50 | B |
| הר ברכה (il-32.1924-35.2651) | flat | 375 | minaret | il-minaret-32.20448-35.13156 | Mosque | 12.64 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 328.4–335.0 | 161.6–217.4 | false | 8.00 | D |
| הר ברכה (il-32.1924-35.2651) | flat | 1280 | minaret | il-minaret-32.20448-35.13156 | Mosque | 12.64 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1128.9–1135.5 | 551.6–742.0 | false | 8.00 | D |
| הנקודה (il-32.1680-35.3156) | flat | 375 | synagogue | il-synagogue-32.17079-35.31484 | (unnamed) | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 194.1–208.2 | true | 9.50 | B |
| הנקודה (il-32.1680-35.3156) | flat | 1280 | synagogue | il-synagogue-32.17079-35.31484 | (unnamed) | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 647.0–710.5 | true | 9.50 | B |
| איתמר (il-32.1745-35.3084) | flat | 375 | synagogue | il-synagogue-32.17343-35.31002 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 157.7–229.0 | true | 9.50 | B |
| איתמר (il-32.1745-35.3084) | flat | 1280 | synagogue | il-synagogue-32.17343-35.31002 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 538.2–781.7 | true | 9.50 | B |
| הדסים (il-32.2862-34.8851) | flat | 375 | synagogue | il-synagogue-32.2754-34.84891 | (unnamed) | 3.61 | beyond | near | 9 (HALL_M default (legacy 9m)) | 322_348:39:36 (נתניה) | 339.8–345.0 | 138.1–226.3 | false | 4.53 | A |
| הדסים (il-32.2862-34.8851) | flat | 1280 | synagogue | il-synagogue-32.2754-34.84891 | (unnamed) | 3.61 | beyond | near | 9 (HALL_M default (legacy 9m)) | 322_348:39:36 (נתניה) | 1166.1–1171.3 | 471.2–772.5 | false | 4.53 | A |
| בני דרור (il-32.2619-34.9002) | flat | 375 | synagogue | il-synagogue-32.26086-34.9004 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 117.7–230.5 | true | 9.50 | B |
| בני דרור (il-32.2619-34.9002) | flat | 1280 | synagogue | il-synagogue-32.26086-34.9004 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 401.7–786.7 | true | 9.50 | B |
| פרדסיה (il-32.3070-34.9098) | flat | 375 | synagogue | il-synagogue-32.30802-34.90958 | בית כנסת רינת ישראל | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 151.0–237.5 | true | 9.50 | B |
| פרדסיה (il-32.3070-34.9098) | flat | 1280 | synagogue | il-synagogue-32.30802-34.90958 | בית כנסת רינת ישראל | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 515.3–810.6 | true | 9.50 | B |
| צור משה (il-32.2978-34.9136) | flat | 375 | synagogue | il-synagogue-32.30271-34.91491 | בית כנסת תורת משה | 0.56 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 110.8–242.9 | true | 9.50 | B |
| צור משה (il-32.2978-34.9136) | flat | 1280 | synagogue | il-synagogue-32.30271-34.91491 | בית כנסת תורת משה | 0.56 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 378.2–829.0 | true | 9.50 | B |
| עזריאל (il-32.2629-34.9712) | flat | 375 | synagogue | il-synagogue-32.26287-34.97119 | (unnamed) | 0.00 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 138.9–213.9 | true | 9.50 | B |
| עזריאל (il-32.2629-34.9712) | flat | 1280 | synagogue | il-synagogue-32.26287-34.97119 | (unnamed) | 0.00 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 474.1–730.0 | true | 9.50 | B |
| כפר יעבץ (il-32.2738-34.9669) | flat | 375 | synagogue | il-synagogue-32.27415-34.96557 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 172.2–231.5 | true | 9.50 | B |
| כפר יעבץ (il-32.2738-34.9669) | flat | 1280 | synagogue | il-synagogue-32.27415-34.96557 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 587.9–790.0 | true | 9.50 | B |
| אבני חפץ (il-32.2848-35.0735) | flat | 375 | synagogue | il-synagogue-32.28982-35.07189 | (unnamed) | 0.58 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 114.6–226.8 | true | 9.50 | B |
| אבני חפץ (il-32.2848-35.0735) | flat | 375 | minaret | il-minaret-32.29534-35.04118 | Mosque | 3.26 | beyond | near | 9 (HALL_M default (legacy 30m)) | 322_350:32:45 (טולכרם) | 346.1–351.0 | 114.6–226.8 | false | 6.01 | A |
| אבני חפץ (il-32.2848-35.0735) | flat | 1280 | synagogue | il-synagogue-32.28982-35.07189 | (unnamed) | 0.58 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 391.2–774.3 | true | 9.50 | B |
| אבני חפץ (il-32.2848-35.0735) | flat | 1280 | minaret | il-minaret-32.29534-35.04118 | Mosque | 3.26 | beyond | near | 9 (HALL_M default (legacy 30m)) | 322_350:32:45 (טולכרם) | 1187.2–1192.2 | 391.2–774.3 | false | 6.01 | A |
| כרמי קדם (il-32.2174-35.1557) | flat | 375 | minaret | il-minaret-32.17931-35.13054 | مسجد ابو بكر | 4.85 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_351:24:38 (ג'ינסאפות) | 249.8–252.0 | 122.8–215.4 | false | 2.72 | A |
| כרמי קדם (il-32.2174-35.1557) | flat | 1280 | minaret | il-minaret-32.17931-35.13054 | مسجد ابو بكر | 4.85 | beyond | near | 9 (HALL_M default (legacy 30m)) | 321_351:24:38 (ג'ינסאפות) | 855.2–857.4 | 419.1–735.1 | false | 2.72 | A |
| גבעת רש"י (il-32.2193-35.1621) | flat | 375 | synagogue | il-synagogue-32.21904-35.16293 | ישיבת קדומים | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 159.0–251.4 | true | 9.50 | B |
| גבעת רש"י (il-32.2193-35.1621) | flat | 1280 | synagogue | il-synagogue-32.21904-35.16293 | ישיבת קדומים | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 542.6–858.1 | true | 9.50 | B |
| מצפה קדומים (il-32.2207-35.1595) | flat | 375 | synagogue | il-synagogue-32.21904-35.16293 | ישיבת קדומים | 0.37 | own | near | 9 (HALL_M default (legacy 9m)) | none | 163.9–174.9 | 140.7–242.7 | true | 9.50 | B |
| מצפה קדומים (il-32.2207-35.1595) | flat | 1280 | synagogue | il-synagogue-32.21904-35.16293 | ישיבת קדומים | 0.37 | own | near | 9 (HALL_M default (legacy 9m)) | none | 572.8–583.8 | 480.3–828.3 | true | 9.50 | B |
| שבי שומרון (il-32.2632-35.1848) | flat | 375 | synagogue | il-synagogue-32.26292-35.18577 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 158.9–213.4 | true | 9.50 | B |
| שבי שומרון (il-32.2632-35.1848) | flat | 1280 | synagogue | il-synagogue-32.26292-35.18577 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 542.4–728.3 | true | 9.50 | B |
| עינב (il-32.2846-35.1264) | flat | 375 | minaret | il-minaret-32.28523-35.14879 | Ramin Big Mosque | 2.10 | beyond | near | 9 (HALL_M default (legacy 30m)) | 322_351:39:40 (ראמין) | 88.8–92.6 | 138.9–205.4 | false | 4.57 | A |
| עינב (il-32.2846-35.1264) | flat | 375 | synagogue | il-synagogue-32.28443-35.12666 | (unnamed) | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 138.9–205.4 | true | 9.50 | B |
| עינב (il-32.2846-35.1264) | flat | 1280 | minaret | il-minaret-32.28523-35.14879 | Ramin Big Mosque | 2.10 | beyond | near | 9 (HALL_M default (legacy 30m)) | 322_351:39:40 (ראמין) | 307.6–311.4 | 474.0–701.1 | false | 4.57 | A |
| עינב (il-32.2846-35.1264) | flat | 1280 | synagogue | il-synagogue-32.28443-35.12666 | (unnamed) | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 474.0–701.1 | true | 9.50 | B |
| אלון מורה (il-32.2357-35.3316) | flat | 375 | synagogue | il-synagogue-32.23476-35.33223 | רחמי תרצה | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 137.9–208.6 | true | 9.50 | B |
| אלון מורה (il-32.2357-35.3316) | flat | 375 | minaret | il-minaret-32.22769-35.30278 | مسجد ابو بكر الصديق | 2.86 | beyond | near | 9 (HALL_M default (legacy 30m)) | 322_353:2:13 (מסאכין) | 298.6–302.8 | 137.9–208.6 | false | 5.13 | A |
| אלון מורה (il-32.2357-35.3316) | flat | 1280 | synagogue | il-synagogue-32.23476-35.33223 | רחמי תרצה | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 470.7–711.9 | true | 9.50 | B |
| אלון מורה (il-32.2357-35.3316) | flat | 1280 | minaret | il-minaret-32.22769-35.30278 | مسجد ابو بكر الصديق | 2.86 | beyond | near | 9 (HALL_M default (legacy 30m)) | 322_353:2:13 (מסאכין) | 1024.3–1028.6 | 470.7–711.9 | false | 5.13 | A |
| חוות נוף גלעד (il-32.2896-35.5193) | flat | 375 | synagogue | il-synagogue-32.28961-35.51991 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | none | false | 9.50 | B |
| חוות נוף גלעד (il-32.2896-35.5193) | flat | 1280 | synagogue | il-synagogue-32.28961-35.51991 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | none | false | 9.50 | B |
| בורגתה (il-32.3265-34.9629) | flat | 375 | minaret | il-minaret-32.28595-34.96568 | (unnamed) | 4.51 | beyond | near | 9 (HALL_M default (legacy 30m)) | 322_349:52:41 (קלנסווה) | 180.3–182.6 | 122.6–244.3 | true | 2.79 | C |
| בורגתה (il-32.3265-34.9629) | flat | 1280 | minaret | il-minaret-32.28595-34.96568 | (unnamed) | 4.51 | beyond | near | 9 (HALL_M default (legacy 30m)) | 322_349:52:41 (קלנסווה) | 618.2–620.5 | 418.6–833.9 | true | 2.79 | C |
| חניאל (il-32.3321-34.9486) | flat | 375 | synagogue | il-synagogue-32.33297-34.95037 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 150.2–255.1 | true | 9.50 | B |
| חניאל (il-32.3321-34.9486) | flat | 1280 | synagogue | il-synagogue-32.33297-34.95037 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 512.8–870.7 | true | 9.50 | B |
| כפר הרא״ה (il-32.3897-34.9119) | flat | 375 | synagogue | il-synagogue-32.38809-34.91196 | בית מדרש ישיבת בני עקיבא כפר הרא"ה | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 149.8–227.5 | true | 9.50 | B |
| כפר הרא״ה (il-32.3897-34.9119) | flat | 1280 | synagogue | il-synagogue-32.38809-34.91196 | בית מדרש ישיבת בני עקיבא כפר הרא"ה | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 511.4–776.7 | true | 9.50 | B |
| חרב לאת (il-32.4013-34.9171) | flat | 375 | synagogue | il-synagogue-32.4021-34.91588 | herev laet Synagogue | 0.15 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 161.0–259.1 | true | 9.50 | B |
| חרב לאת (il-32.4013-34.9171) | flat | 1280 | synagogue | il-synagogue-32.4021-34.91588 | herev laet Synagogue | 0.15 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 549.5–884.4 | true | 9.50 | B |
| יד חנה (il-32.3255-35.0061) | flat | 375 | minaret | il-minaret-32.30453-35.03117 | مسجد نور الهدى | 3.32 | beyond | near | 9 (HALL_M default (legacy 30m)) | 323_350:24:2 (טולכרם) | 136.9–139.0 | 146.0–246.4 | false | 2.53 | A |
| יד חנה (il-32.3255-35.0061) | flat | 375 | synagogue | il-synagogue-32.32561-35.00681 | בית כנסת יד חנה חומש | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 146.0–246.4 | true | 9.50 | B |
| יד חנה (il-32.3255-35.0061) | flat | 1280 | minaret | il-minaret-32.30453-35.03117 | مسجد نور الهدى | 3.32 | beyond | near | 9 (HALL_M default (legacy 30m)) | 323_350:24:2 (טולכרם) | 469.9–471.9 | 498.3–840.9 | false | 2.53 | A |
| יד חנה (il-32.3255-35.0061) | flat | 1280 | synagogue | il-synagogue-32.32561-35.00681 | בית כנסת יד חנה חומש | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 498.3–840.9 | true | 9.50 | B |
| בת חפר (il-32.3345-35.0123) | flat | 375 | minaret | il-minaret-32.32059-35.03273 | مسجد عائشة | 2.46 | beyond | near | 9 (HALL_M default (legacy 30m)) | 323_350:26:9 (טולכרם) | 127.4–130.2 | 128.8–247.3 | true | 3.48 | C |
| בת חפר (il-32.3345-35.0123) | flat | 375 | synagogue | il-synagogue-32.33485-35.01054 | מקווה נשים בת חפר | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 128.8–247.3 | true | 9.50 | B |
| בת חפר (il-32.3345-35.0123) | flat | 1280 | minaret | il-minaret-32.32059-35.03273 | مسجد عائشة | 2.46 | beyond | near | 9 (HALL_M default (legacy 30m)) | 323_350:26:9 (טולכרם) | 438.2–441.0 | 439.6–844.1 | true | 3.48 | C |
| בת חפר (il-32.3345-35.0123) | flat | 1280 | synagogue | il-synagogue-32.33485-35.01054 | מקווה נשים בת חפר | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 439.6–844.1 | true | 9.50 | B |
| משכיות (il-32.3173-35.5025) | flat | 375 | synagogue | il-synagogue-32.31802-35.50045 | (unnamed) | 0.21 | own | near | 9 (HALL_M default (legacy 9m)) | none | 196.2–207.2 | 193.3–204.9 | true | 9.50 | B |
| משכיות (il-32.3173-35.5025) | flat | 1280 | synagogue | il-synagogue-32.31802-35.50045 | (unnamed) | 0.21 | own | near | 9 (HALL_M default (legacy 9m)) | none | 683.0–694.0 | 645.8–699.6 | true | 9.50 | B |
| רותם (il-32.3365-35.5188) | flat | 375 | synagogue | il-synagogue-32.33673-35.51877 | בית כנסת רותם | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 172.8–213.9 | true | 9.50 | B |
| רותם (il-32.3365-35.5188) | flat | 1280 | synagogue | il-synagogue-32.33673-35.51877 | בית כנסת רותם | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 589.9–730.0 | true | 9.50 | B |
| גבעת סלעית (il-32.3636-35.5100) | flat | 375 | synagogue | il-synagogue-32.36595-35.51565 | (unnamed) | 0.59 | own | near | 9 (HALL_M default (legacy 9m)) | none | 152.1–163.1 | 137.5–181.2 | true | 9.50 | B |
| גבעת סלעית (il-32.3636-35.5100) | flat | 1280 | synagogue | il-synagogue-32.36595-35.51565 | (unnamed) | 0.59 | own | near | 9 (HALL_M default (legacy 9m)) | none | 532.5–543.5 | 469.4–618.3 | true | 9.50 | B |
| מחולה (il-32.3652-35.5156) | flat | 375 | synagogue | il-synagogue-32.36595-35.51565 | (unnamed) | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 159.4–223.5 | true | 9.50 | B |
| מחולה (il-32.3652-35.5156) | flat | 1280 | synagogue | il-synagogue-32.36595-35.51565 | (unnamed) | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 544.1–762.8 | true | 9.50 | B |
| חדרה (il-32.4370-34.9198) | flat | 375 | synagogue | il-synagogue-32.43595-34.91766 | בית כנסת הרמב"ם החדש | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 43.4–327.9 | true | 9.50 | B |
| חדרה (il-32.4370-34.9198) | flat | 1280 | synagogue | il-synagogue-32.43595-34.91766 | בית כנסת הרמב"ם החדש | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 148.3–1119.4 | true | 9.50 | B |
| אור עקיבא (il-32.5090-34.9196) | flat | 375 | synagogue | il-synagogue-32.5092-34.92179 | עדת ישורון | 0.21 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 128.3–218.5 | true | 9.50 | B |
| אור עקיבא (il-32.5090-34.9196) | flat | 1280 | synagogue | il-synagogue-32.5092-34.92179 | עדת ישורון | 0.21 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 438.0–746.0 | true | 9.50 | B |
| תלמי אלעזר (il-32.4432-34.9737) | flat | 375 | synagogue | il-synagogue-32.44569-34.97423 | היכל דניאל | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 68.4–278.5 | true | 9.50 | B |
| תלמי אלעזר (il-32.4432-34.9737) | flat | 1280 | synagogue | il-synagogue-32.44569-34.97423 | היכל דניאל | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 233.6–950.7 | true | 9.50 | B |
| מאור (il-32.4239-35.0064) | flat | 375 | synagogue | il-synagogue-32.42326-35.00475 | תפארת משה | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 82.9–308.3 | true | 9.50 | B |
| מאור (il-32.4239-35.0064) | flat | 1280 | synagogue | il-synagogue-32.42326-35.00475 | תפארת משה | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 283.0–1052.2 | true | 9.50 | B |
| קציר (il-32.4886-35.1017) | flat | 375 | synagogue | il-synagogue-32.48387-35.10941 | (unnamed) | 0.90 | own | near | 9 (HALL_M default (legacy 9m)) | none | 162.0–173.0 | 48.1–357.5 | true | 9.50 | B |
| קציר (il-32.4886-35.1017) | flat | 1280 | synagogue | il-synagogue-32.48387-35.10941 | (unnamed) | 0.90 | own | near | 9 (HALL_M default (legacy 9m)) | none | 566.3–577.3 | 164.3–1220.3 | true | 9.50 | B |
| שקד (il-32.4737-35.1686) | flat | 375 | synagogue | il-synagogue-32.47506-35.16761 | (unnamed) | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 116.4–243.5 | true | 9.50 | B |
| שקד (il-32.4737-35.1686) | flat | 1280 | synagogue | il-synagogue-32.47506-35.16761 | (unnamed) | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 397.3–831.3 | true | 9.50 | B |
| חיננית (il-32.4808-35.1735) | flat | 375 | synagogue | il-synagogue-32.48083-35.17102 | (unnamed) | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 195.6–206.6 | 143.9–220.1 | true | 9.50 | B |
| חיננית (il-32.4808-35.1735) | flat | 1280 | synagogue | il-synagogue-32.48083-35.17102 | (unnamed) | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 680.9–691.9 | 491.2–751.4 | true | 9.50 | B |
| טל מנשה (il-32.4834-35.1604) | flat | 375 | synagogue | il-synagogue-32.48277-35.16154 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 162.5–209.7 | true | 9.50 | B |
| טל מנשה (il-32.4834-35.1604) | flat | 1280 | synagogue | il-synagogue-32.48277-35.16154 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 554.8–715.8 | true | 9.50 | B |
| שדי תרומות (il-32.4414-35.4854) | flat | 375 | synagogue | il-synagogue-32.43961-35.48555 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 141.9–235.7 | true | 9.50 | B |
| שדי תרומות (il-32.4414-35.4854) | flat | 1280 | synagogue | il-synagogue-32.43961-35.48555 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 484.4–804.6 | true | 9.50 | B |
| רחוב (il-32.4519-35.4886) | flat | 375 | synagogue | il-synagogue-32.45104-35.49114 | (unnamed) | 0.26 | own | near | 9 (HALL_M default (legacy 9m)) | none | 167.7–178.7 | 153.5–234.4 | true | 9.50 | B |
| רחוב (il-32.4519-35.4886) | flat | 375 | synagogue | il-synagogue-32.45207-35.48658 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 153.5–234.4 | true | 9.50 | B |
| רחוב (il-32.4519-35.4886) | flat | 1280 | synagogue | il-synagogue-32.45104-35.49114 | (unnamed) | 0.26 | own | near | 9 (HALL_M default (legacy 9m)) | none | 585.8–596.8 | 524.0–800.1 | true | 9.50 | B |
| רחוב (il-32.4519-35.4886) | flat | 1280 | synagogue | il-synagogue-32.45207-35.48658 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 524.0–800.1 | true | 9.50 | B |
| תל תאומים (il-32.4424-35.4965) | flat | 375 | synagogue | il-synagogue-32.44131-35.49346 | (unnamed) | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 200.5–211.5 | 163.9–212.2 | true | 9.50 | B |
| תל תאומים (il-32.4424-35.4965) | flat | 1280 | synagogue | il-synagogue-32.44131-35.49346 | (unnamed) | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 697.5–708.5 | 559.6–724.5 | true | 9.50 | B |
| עין הנציב (il-32.4698-35.5015) | flat | 375 | synagogue | il-synagogue-32.47303-35.50124 | בית כנסת עין הנצי"ב | 0.36 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 118.5–215.4 | true | 9.50 | B |
| עין הנציב (il-32.4698-35.5015) | flat | 1280 | synagogue | il-synagogue-32.47303-35.50124 | בית כנסת עין הנצי"ב | 0.36 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 404.6–735.2 | true | 9.50 | B |
| מעלה גלבוע (il-32.4780-35.4175) | flat | 375 | minaret | il-minaret-32.45963-35.41444 | المسجد القديم | 2.06 | beyond | near | 9 (HALL_M default (legacy 30m)) | 324_354:11:28 (ג'לבון) | 193.4–196.1 | 158.2–232.4 | true | 3.19 | C |
| מעלה גלבוע (il-32.4780-35.4175) | flat | 375 | synagogue | il-synagogue-32.47782-35.41828 | בית כנסת מעלה גלבוע | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 158.2–232.4 | true | 9.50 | B |
| מעלה גלבוע (il-32.4780-35.4175) | flat | 1280 | minaret | il-minaret-32.45963-35.41444 | المسجد القديم | 2.06 | beyond | near | 9 (HALL_M default (legacy 30m)) | 324_354:11:28 (ג'לבון) | 663.5–666.1 | 539.9–793.1 | true | 3.19 | C |
| מעלה גלבוע (il-32.4780-35.4175) | flat | 1280 | synagogue | il-synagogue-32.47782-35.41828 | בית כנסת מעלה גלבוע | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 539.9–793.1 | true | 9.50 | B |
| טירת צבי (il-32.4219-35.5280) | flat | 375 | synagogue | il-synagogue-32.41974-35.52829 | בית כנסת טירת צבי | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 157.0–221.0 | true | 9.50 | B |
| טירת צבי (il-32.4219-35.5280) | flat | 1280 | synagogue | il-synagogue-32.41974-35.52829 | בית כנסת טירת צבי | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 535.8–754.2 | true | 9.50 | B |
| שדה אליהו (il-32.4405-35.5150) | flat | 375 | synagogue | il-synagogue-32.41974-35.52829 | בית כנסת טירת צבי | 2.63 | beyond | near | 9 (HALL_M default (legacy 9m)) | 324_355:22:9 (טירת צבי) | 131.7–135.3 | 151.7–222.0 | false | 3.12 | A |
| שדה אליהו (il-32.4405-35.5150) | flat | 375 | synagogue | il-synagogue-32.43826-35.51237 | בית כנסת שדה אליהו | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 196.7–207.7 | 151.7–222.0 | true | 9.50 | B |
| שדה אליהו (il-32.4405-35.5150) | flat | 1280 | synagogue | il-synagogue-32.41974-35.52829 | בית כנסת טירת צבי | 2.63 | beyond | near | 9 (HALL_M default (legacy 9m)) | 324_355:22:9 (טירת צבי) | 453.8–457.4 | 517.8–757.9 | false | 3.12 | A |
| שדה אליהו (il-32.4405-35.5150) | flat | 1280 | synagogue | il-synagogue-32.43826-35.51237 | בית כנסת שדה אליהו | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 684.6–695.6 | 517.8–757.9 | true | 9.50 | B |
| מעוז חיים (il-32.4934-35.5513) | flat | 375 | synagogue | il-synagogue-32.49366-35.54663 | (unnamed) | 0.44 | own | near | 9 (HALL_M default (legacy 9m)) | none | 200.2–211.2 | 116.0–226.8 | true | 9.50 | B |
| מעוז חיים (il-32.4934-35.5513) | flat | 1280 | synagogue | il-synagogue-32.49366-35.54663 | (unnamed) | 0.44 | own | near | 9 (HALL_M default (legacy 9m)) | none | 696.6–707.6 | 395.9–774.2 | true | 9.50 | B |
| גבעת עדה (il-32.5167-35.0035) | flat | 375 | synagogue | il-synagogue-32.51787-35.0037 | בית הכנסת המרכזי | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 85.9–248.4 | true | 9.50 | B |
| גבעת עדה (il-32.5167-35.0035) | flat | 375 | synagogue | il-synagogue-32.52116-35.01025 | תפארת ישראל | 0.80 | own | near | 9 (HALL_M default (legacy 9m)) | none | 160.4–171.4 | 85.9–248.4 | true | 9.50 | B |
| גבעת עדה (il-32.5167-35.0035) | flat | 1280 | synagogue | il-synagogue-32.51787-35.0037 | בית הכנסת המרכזי | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 293.2–847.8 | true | 9.50 | B |
| גבעת עדה (il-32.5167-35.0035) | flat | 1280 | synagogue | il-synagogue-32.52116-35.01025 | תפארת ישראל | 0.80 | own | near | 9 (HALL_M default (legacy 9m)) | none | 560.8–571.8 | 293.2–847.8 | true | 9.50 | B |
| כפר גליקסון (il-32.5050-35.0048) | flat | 375 | synagogue | il-synagogue-32.50454-35.00489 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 154.8–240.7 | true | 9.50 | B |
| כפר גליקסון (il-32.5050-35.0048) | flat | 1280 | synagogue | il-synagogue-32.50454-35.00489 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 528.4–821.7 | true | 9.50 | B |
| רגבים (il-32.5241-35.0345) | flat | 375 | synagogue | il-synagogue-32.52318-35.0337 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 132.8–228.0 | true | 9.50 | B |
| רגבים (il-32.5241-35.0345) | flat | 1280 | synagogue | il-synagogue-32.52318-35.0337 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 453.4–778.3 | true | 9.50 | B |
| בת שלמה (il-32.5994-35.0029) | flat | 375 | synagogue | il-synagogue-32.596-35.00447 | (unnamed) | 0.41 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 97.5–221.0 | true | 9.50 | B |
| בת שלמה (il-32.5994-35.0029) | flat | 1280 | synagogue | il-synagogue-32.596-35.00447 | (unnamed) | 0.41 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 332.9–754.4 | true | 9.50 | B |
| מגידו (il-32.5787-35.1807) | flat | 375 | church | il-church-32.63064-35.35011 | כנסיית בן האלמנה | 16.89 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 19.3–25.5 | 121.3–203.3 | false | 8.00 | D |
| מגידו (il-32.5787-35.1807) | flat | 1280 | church | il-church-32.63064-35.35011 | כנסיית בן האלמנה | 16.89 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 73.5–79.7 | 414.1–693.8 | false | 8.00 | D |
| ברק (il-32.5425-35.2654) | flat | 375 | synagogue | il-synagogue-32.54249-35.26482 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 134.7–256.2 | true | 9.50 | B |
| ברק (il-32.5425-35.2654) | flat | 1280 | synagogue | il-synagogue-32.54249-35.26482 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 459.9–874.6 | true | 9.50 | B |
| אדירים (il-32.5491-35.2712) | flat | 375 | synagogue | il-synagogue-32.54879-35.27098 | (unnamed) | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 148.0–216.9 | true | 9.50 | B |
| אדירים (il-32.5491-35.2712) | flat | 1280 | synagogue | il-synagogue-32.54879-35.27098 | (unnamed) | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 505.3–740.2 | true | 9.50 | B |
| דבורה (il-32.5531-35.2635) | flat | 375 | synagogue | il-synagogue-32.55251-35.26429 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 133.1–207.5 | true | 9.50 | B |
| דבורה (il-32.5531-35.2635) | flat | 1280 | synagogue | il-synagogue-32.55251-35.26429 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 454.3–708.2 | true | 9.50 | B |
| מיטב (il-32.5457-35.3013) | flat | 375 | synagogue | il-synagogue-32.54525-35.30045 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 150.0–223.6 | true | 9.50 | B |
| מיטב (il-32.5457-35.3013) | flat | 1280 | synagogue | il-synagogue-32.54525-35.30045 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 512.2–763.1 | true | 9.50 | B |
| פרזון (il-32.5454-35.3112) | flat | 375 | synagogue | il-synagogue-32.54502-35.31146 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 81.0–209.8 | true | 9.50 | B |
| פרזון (il-32.5454-35.3112) | flat | 1280 | synagogue | il-synagogue-32.54502-35.31146 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 276.5–716.0 | true | 9.50 | B |
| אביטל (il-32.5579-35.3064) | flat | 375 | synagogue | il-synagogue-32.55773-35.30727 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 155.0–211.6 | true | 9.50 | B |
| אביטל (il-32.5579-35.3064) | flat | 1280 | synagogue | il-synagogue-32.55773-35.30727 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 529.1–722.1 | true | 9.50 | B |
| מלאה (il-32.5635-35.2360) | flat | 375 | synagogue | il-synagogue-32.56284-35.23731 | מגן אברהם | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 164.1–209.7 | true | 9.50 | B |
| מלאה (il-32.5635-35.2360) | flat | 1280 | synagogue | il-synagogue-32.56284-35.23731 | מגן אברהם | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 560.0–715.7 | true | 9.50 | B |
| עפולה (il-32.6076-35.2891) | flat | 375 | church | il-church-32.63064-35.35011 | כנסיית בן האלמנה | 6.26 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 13.1–19.3 | 47.0–276.9 | false | 8.00 | D |
| עפולה (il-32.6076-35.2891) | flat | 1280 | church | il-church-32.63064-35.35011 | כנסיית בן האלמנה | 6.26 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 52.2–58.4 | 160.6–945.1 | false | 8.00 | D |
| גן נר (il-32.5309-35.3391) | flat | 375 | synagogue | il-synagogue-32.52787-35.33524 | (unnamed) | 0.49 | own | near | 9 (HALL_M default (legacy 9m)) | none | 195.0–206.0 | 164.8–238.8 | true | 9.50 | B |
| גן נר (il-32.5309-35.3391) | flat | 375 | minaret | il-minaret-32.51432-35.29485 | (unnamed) | 4.54 | beyond | near | 9 (HALL_M default (legacy 30m)) | 325_352:75:6 (מוקיבלה) | 307.9–310.7 | 164.8–238.8 | false | 3.36 | A |
| גן נר (il-32.5309-35.3391) | flat | 1280 | synagogue | il-synagogue-32.52787-35.33524 | (unnamed) | 0.49 | own | near | 9 (HALL_M default (legacy 9m)) | none | 678.9–689.9 | 562.6–815.0 | true | 9.50 | B |
| גן נר (il-32.5309-35.3391) | flat | 1280 | minaret | il-minaret-32.51432-35.29485 | (unnamed) | 4.54 | beyond | near | 9 (HALL_M default (legacy 30m)) | 325_352:75:6 (מוקיבלה) | 1054.3–1057.1 | 562.6–815.0 | false | 3.36 | A |
| גדעונה (il-32.5487-35.3593) | flat | 375 | synagogue | il-synagogue-32.54929-35.35863 | שערי אורה | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 123.2–264.7 | true | 9.50 | B |
| גדעונה (il-32.5487-35.3593) | flat | 1280 | synagogue | il-synagogue-32.54929-35.35863 | שערי אורה | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 420.4–903.5 | true | 9.50 | B |
| כפר יחזקאל (il-32.5683-35.3624) | flat | 375 | synagogue | il-synagogue-32.56818-35.36077 | (unnamed) | 0.15 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 132.9–285.1 | true | 9.50 | B |
| כפר יחזקאל (il-32.5683-35.3624) | flat | 1280 | synagogue | il-synagogue-32.56818-35.36077 | (unnamed) | 0.15 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 453.8–973.2 | true | 9.50 | B |
| מושב מרחביה (il-32.6024-35.3160) | flat | 375 | synagogue | il-synagogue-32.60355-35.31678 | בית כנסת מושב מרחביה | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 128.2–213.5 | true | 9.50 | B |
| מושב מרחביה (il-32.6024-35.3160) | flat | 1280 | synagogue | il-synagogue-32.60355-35.31678 | בית כנסת מושב מרחביה | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 437.7–728.9 | true | 9.50 | B |
| בית יוסף (il-32.5588-35.5523) | flat | 375 | synagogue | il-synagogue-32.55863-35.55087 | (unnamed) | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 151.1–234.7 | true | 9.50 | B |
| בית יוסף (il-32.5588-35.5523) | flat | 1280 | synagogue | il-synagogue-32.55863-35.55087 | (unnamed) | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 515.6–801.1 | true | 9.50 | B |
| ירדנה (il-32.5644-35.5646) | flat | 375 | synagogue | il-synagogue-32.56544-35.56487 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 158.9–231.4 | true | 9.50 | B |
| ירדנה (il-32.5644-35.5646) | flat | 1280 | synagogue | il-synagogue-32.56544-35.56487 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 542.3–789.7 | true | 9.50 | B |
| עופר (il-32.6221-34.9828) | flat | 375 | synagogue | il-synagogue-32.57398-34.95381 | בית כנסת אוהל יעקב | 6.00 | other | near | 9 (HALL_M default (legacy 9m)) | none | 222.4–233.4 | 162.8–231.4 | true | 9.50 | D |
| עופר (il-32.6221-34.9828) | flat | 375 | synagogue | il-synagogue-32.62166-34.98111 | (unnamed) | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 162.8–231.4 | true | 9.50 | B |
| עופר (il-32.6221-34.9828) | flat | 1280 | synagogue | il-synagogue-32.57398-34.95381 | בית כנסת אוהל יעקב | 6.00 | other | near | 9 (HALL_M default (legacy 9m)) | none | 772.3–783.3 | 555.7–789.7 | true | 9.50 | D |
| עופר (il-32.6221-34.9828) | flat | 1280 | synagogue | il-synagogue-32.62166-34.98111 | (unnamed) | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 555.7–789.7 | true | 9.50 | B |
| עין איילה (il-32.6287-34.9454) | flat | 375 | synagogue | il-synagogue-32.62927-34.94458 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 98.1–251.2 | true | 9.50 | B |
| עין איילה (il-32.6287-34.9454) | flat | 1280 | synagogue | il-synagogue-32.62927-34.94458 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 334.9–857.3 | true | 9.50 | B |
| צרופה (il-32.6482-34.9481) | flat | 375 | synagogue | il-synagogue-32.64874-34.94766 | (unnamed) | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 124.2–255.9 | true | 9.50 | B |
| צרופה (il-32.6482-34.9481) | flat | 1280 | synagogue | il-synagogue-32.64874-34.94766 | (unnamed) | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 423.8–873.4 | true | 9.50 | B |
| ימין אורד (il-32.7017-34.9898) | flat | 375 | synagogue | il-synagogue-32.70227-34.98645 | (unnamed) | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 204.6–215.6 | 166.0–217.5 | true | 9.50 | B |
| ימין אורד (il-32.7017-34.9898) | flat | 1280 | synagogue | il-synagogue-32.70227-34.98645 | (unnamed) | 0.32 | own | near | 9 (HALL_M default (legacy 9m)) | none | 711.8–722.8 | 566.7–742.4 | true | 9.50 | B |
| ניר עציון (il-32.6976-34.9936) | flat | 375 | synagogue | il-synagogue-32.69765-34.99046 | (unnamed) | 0.29 | own | near | 9 (HALL_M default (legacy 9m)) | none | 202.7–213.7 | 153.7–216.2 | true | 9.50 | B |
| ניר עציון (il-32.6976-34.9936) | flat | 1280 | synagogue | il-synagogue-32.69765-34.99046 | (unnamed) | 0.29 | own | near | 9 (HALL_M default (legacy 9m)) | none | 705.3–716.3 | 524.5–737.9 | true | 9.50 | B |
| עין העמק (il-32.6290-35.0854) | flat | 375 | synagogue | il-synagogue-32.63099-35.0827 | בית כנסת עין העמק | 0.33 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 153.8–270.1 | true | 9.50 | B |
| עין העמק (il-32.6290-35.0854) | flat | 1280 | synagogue | il-synagogue-32.63099-35.0827 | בית כנסת עין העמק | 0.33 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 525.1–922.0 | true | 9.50 | B |
| יוקנעם עילית (il-32.6481-35.0943) | flat | 375 | synagogue | il-synagogue-32.64395-35.09487 | בית כנסת אחדות | 0.46 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 114.9–249.5 | true | 9.50 | B |
| יוקנעם עילית (il-32.6481-35.0943) | flat | 375 | synagogue | il-synagogue-32.64775-35.09389 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 114.9–249.5 | true | 9.50 | B |
| יוקנעם עילית (il-32.6481-35.0943) | flat | 1280 | synagogue | il-synagogue-32.64395-35.09487 | בית כנסת אחדות | 0.46 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 392.1–851.5 | true | 9.50 | B |
| יוקנעם עילית (il-32.6481-35.0943) | flat | 1280 | synagogue | il-synagogue-32.64775-35.09389 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 392.1–851.5 | true | 9.50 | B |
| יוקנעם המושבה (il-32.6538-35.1148) | flat | 375 | synagogue | il-synagogue-32.65168-35.11398 | (unnamed) | 0.25 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 133.4–251.3 | true | 9.50 | B |
| יוקנעם המושבה (il-32.6538-35.1148) | flat | 1280 | synagogue | il-synagogue-32.65168-35.11398 | (unnamed) | 0.25 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 455.3–857.6 | true | 9.50 | B |
| כפר תקווה (il-32.7014-35.1145) | flat | 375 | synagogue | il-synagogue-32.69262-35.10841 | אליהו הנביא | 1.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 199.7–210.7 | 132.2–296.1 | true | 9.50 | B |
| כפר תקווה (il-32.7014-35.1145) | flat | 375 | synagogue | il-synagogue-32.71016-35.11556 | התנועה ליהדות מתקדמת | 0.98 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 132.2–296.1 | true | 9.50 | B |
| כפר תקווה (il-32.7014-35.1145) | flat | 1280 | synagogue | il-synagogue-32.69262-35.10841 | אליהו הנביא | 1.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 694.7–705.7 | 451.4–1010.8 | true | 9.50 | B |
| כפר תקווה (il-32.7014-35.1145) | flat | 1280 | synagogue | il-synagogue-32.71016-35.11556 | התנועה ליהדות מתקדמת | 0.98 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 451.4–1010.8 | true | 9.50 | B |
| קריית טבעון (il-32.7161-35.1268) | flat | 375 | synagogue | il-synagogue-32.71235-35.12244 | בית שערים | 0.59 | own | near | 9 (HALL_M default (legacy 9m)) | none | 195.5–206.5 | 119.8–278.1 | true | 9.50 | B |
| קריית טבעון (il-32.7161-35.1268) | flat | 1280 | synagogue | il-synagogue-32.71235-35.12244 | בית שערים | 0.59 | own | near | 9 (HALL_M default (legacy 9m)) | none | 680.7–691.7 | 408.9–949.2 | true | 9.50 | B |
| שער העמקים (il-32.7231-35.1131) | flat | 375 | synagogue | il-synagogue-32.71016-35.11556 | התנועה ליהדות מתקדמת | 1.45 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 133.6–288.3 | true | 9.50 | B |
| שער העמקים (il-32.7231-35.1131) | flat | 1280 | synagogue | il-synagogue-32.71016-35.11556 | התנועה ליהדות מתקדמת | 1.45 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 455.9–984.1 | true | 9.50 | B |
| בית זייד (il-32.7022-35.1313) | flat | 375 | synagogue | il-synagogue-32.70545-35.12419 | ישועת ישראל | 0.76 | own | near | 9 (HALL_M default (legacy 9m)) | none | 210.3–221.3 | 104.9–251.9 | true | 9.50 | B |
| בית זייד (il-32.7022-35.1313) | flat | 1280 | synagogue | il-synagogue-32.70545-35.12419 | ישועת ישראל | 0.76 | own | near | 9 (HALL_M default (legacy 9m)) | none | 731.1–742.1 | 358.1–859.7 | true | 9.50 | B |
| אלונים (il-32.7199-35.1447) | flat | 375 | synagogue | il-synagogue-32.72072-35.13473 | שערי צדק | 0.94 | own | near | 9 (HALL_M default (legacy 9m)) | none | 219.3–230.3 | 111.3–245.9 | true | 9.50 | B |
| אלונים (il-32.7199-35.1447) | flat | 1280 | synagogue | il-synagogue-32.72072-35.13473 | שערי צדק | 0.94 | own | near | 9 (HALL_M default (legacy 9m)) | none | 761.9–772.9 | 379.9–839.5 | true | 9.50 | B |
| שדה יעקב (il-32.6974-35.1418) | flat | 375 | synagogue | il-synagogue-32.69724-35.14113 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 131.6–248.6 | true | 9.50 | B |
| שדה יעקב (il-32.6974-35.1418) | flat | 375 | minaret | il-minaret-32.70347-35.29766 | المسجد الأبيض | 14.60 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 45.2–51.8 | 131.6–248.6 | false | 8.00 | D |
| שדה יעקב (il-32.6974-35.1418) | flat | 1280 | synagogue | il-synagogue-32.69724-35.14113 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 449.2–848.7 | true | 9.50 | B |
| שדה יעקב (il-32.6974-35.1418) | flat | 1280 | minaret | il-minaret-32.70347-35.29766 | المسجد الأبيض | 14.60 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 162.2–168.8 | 449.2–848.7 | false | 8.00 | D |
| רמת ישי (il-32.7025-35.1652) | flat | 375 | minaret | il-minaret-32.70347-35.29766 | المسجد الأبيض | 12.39 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 48.4–55.0 | 121.4–235.6 | false | 8.00 | D |
| רמת ישי (il-32.7025-35.1652) | flat | 1280 | minaret | il-minaret-32.70347-35.29766 | المسجد الأبيض | 12.39 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 173.1–179.7 | 414.5–804.1 | false | 8.00 | D |
| היוגב (il-32.6114-35.2057) | flat | 375 | synagogue | il-synagogue-32.61292-35.20613 | (unnamed) | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 128.6–232.3 | true | 9.50 | B |
| היוגב (il-32.6114-35.2057) | flat | 1280 | synagogue | il-synagogue-32.61292-35.20613 | (unnamed) | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 438.8–792.9 | true | 9.50 | B |
| כפר גדעון (il-32.6430-35.2916) | flat | 375 | synagogue | il-synagogue-32.64418-35.29022 | בית הכנסת כפר גדעון | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 108.0–210.9 | true | 9.50 | B |
| כפר גדעון (il-32.6430-35.2916) | flat | 375 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 10.60 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 8.8–15.0 | 108.0–210.9 | false | 8.00 | D |
| כפר גדעון (il-32.6430-35.2916) | flat | 1280 | synagogue | il-synagogue-32.64418-35.29022 | בית הכנסת כפר גדעון | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 368.7–720.0 | true | 9.50 | B |
| כפר גדעון (il-32.6430-35.2916) | flat | 1280 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 10.60 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 37.7–43.8 | 368.7–720.0 | false | 8.00 | D |
| מגדל העמק (il-32.6766-35.2413) | flat | 375 | synagogue | il-synagogue-32.67418-35.24273 | חב"ד | 0.30 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 109.9–246.7 | true | 9.50 | B |
| מגדל העמק (il-32.6766-35.2413) | flat | 1280 | synagogue | il-synagogue-32.67418-35.24273 | חב"ד | 0.30 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 375.2–842.1 | true | 9.50 | B |
| כפר קיש (il-32.6664-35.4488) | flat | 375 | synagogue | il-synagogue-32.66726-35.44819 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 140.5–214.3 | true | 9.50 | B |
| כפר קיש (il-32.6664-35.4488) | flat | 1280 | synagogue | il-synagogue-32.66726-35.44819 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 479.7–731.6 | true | 9.50 | B |
| כפר תבור (il-32.6878-35.4204) | flat | 375 | synagogue | il-synagogue-32.68736-35.41732 | בית הכנסת עץ החיים | 0.29 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.1–205.1 | 147.9–230.8 | true | 9.50 | B |
| כפר תבור (il-32.6878-35.4204) | flat | 375 | minaret | il-minaret-32.70347-35.29766 | المسجد الأبيض | 11.62 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 332.2–338.8 | 147.9–230.8 | false | 8.00 | D |
| כפר תבור (il-32.6878-35.4204) | flat | 375 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 7.96 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 29.4–38.7 | 147.9–230.8 | false | 8.00 | D |
| כפר תבור (il-32.6878-35.4204) | flat | 1280 | synagogue | il-synagogue-32.68736-35.41732 | בית הכנסת עץ החיים | 0.29 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.7–686.7 | 504.7–787.9 | true | 9.50 | B |
| כפר תבור (il-32.6878-35.4204) | flat | 1280 | minaret | il-minaret-32.70347-35.29766 | المسجد الأبيض | 11.62 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1141.8–1148.4 | 504.7–787.9 | false | 8.00 | D |
| כפר תבור (il-32.6878-35.4204) | flat | 1280 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 7.96 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 111.7–120.9 | 504.7–787.9 | false | 8.00 | D |
| אשדות יעקב איחוד (il-32.6582-35.5811) | flat | 375 | synagogue | il-synagogue-32.65845-35.58287 | (unnamed) | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 148.9–258.9 | true | 9.50 | B |
| אשדות יעקב איחוד (il-32.6582-35.5811) | flat | 1280 | synagogue | il-synagogue-32.65845-35.58287 | (unnamed) | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 508.4–883.8 | true | 9.50 | B |
| מנחמיה (il-32.6670-35.5556) | flat | 375 | synagogue | il-synagogue-32.66372-35.5525 | (unnamed) | 0.47 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 143.5–205.9 | true | 9.50 | B |
| מנחמיה (il-32.6670-35.5556) | flat | 375 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 15.42 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 331.4–337.6 | 143.5–205.9 | false | 8.00 | D |
| מנחמיה (il-32.6670-35.5556) | flat | 1280 | synagogue | il-synagogue-32.66372-35.5525 | (unnamed) | 0.47 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 489.8–702.9 | true | 9.50 | B |
| מנחמיה (il-32.6670-35.5556) | flat | 1280 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 15.42 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1138.8–1145.0 | 489.8–702.9 | false | 8.00 | D |
| אפיקים (il-32.6814-35.5783) | flat | 375 | synagogue | il-synagogue-32.68061-35.5805 | (unnamed) | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 169.7–180.7 | 136.6–212.9 | true | 9.50 | B |
| אפיקים (il-32.6814-35.5783) | flat | 375 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 7.40 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 346.4–355.7 | 136.6–212.9 | false | 8.00 | D |
| אפיקים (il-32.6814-35.5783) | flat | 1280 | synagogue | il-synagogue-32.68061-35.5805 | (unnamed) | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 592.7–603.7 | 466.4–726.7 | true | 9.50 | B |
| אפיקים (il-32.6814-35.5783) | flat | 1280 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 7.40 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1193.5–1202.8 | 466.4–726.7 | false | 8.00 | D |
| שער הגולן (il-32.6858-35.6043) | flat | 375 | synagogue | il-synagogue-32.68465-35.60454 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 123.9–205.3 | true | 9.50 | B |
| שער הגולן (il-32.6858-35.6043) | flat | 375 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 9.62 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 335.1–344.4 | 123.9–205.3 | false | 8.00 | D |
| שער הגולן (il-32.6858-35.6043) | flat | 1280 | synagogue | il-synagogue-32.68465-35.60454 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 423.0–700.7 | true | 9.50 | B |
| שער הגולן (il-32.6858-35.6043) | flat | 1280 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 9.62 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1155.1–1164.3 | 423.0–700.7 | false | 8.00 | D |
| יבנאל (il-32.7055-35.5053) | flat | 375 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 162.3–275.9 | true | 9.50 | B |
| יבנאל (il-32.7055-35.5053) | flat | 375 | church | il-church-32.74695-35.33865 | כנסיית החתונה | 16.25 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 344.2–350.4 | 162.3–275.9 | false | 8.00 | D |
| יבנאל (il-32.7055-35.5053) | flat | 1280 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 553.8–941.9 | true | 9.50 | B |
| יבנאל (il-32.7055-35.5053) | flat | 1280 | church | il-church-32.74695-35.33865 | כנסיית החתונה | 16.25 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1182.4–1188.6 | 553.8–941.9 | false | 8.00 | D |
| דגניה ב' (il-32.6999-35.5747) | flat | 375 | synagogue | il-synagogue-32.7016-35.57525 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 115.8–209.3 | true | 9.50 | B |
| דגניה ב' (il-32.6999-35.5747) | flat | 375 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 6.66 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 322.3–331.6 | 115.8–209.3 | false | 8.00 | D |
| דגניה ב' (il-32.6999-35.5747) | flat | 1280 | synagogue | il-synagogue-32.7016-35.57525 | (unnamed) | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 395.3–714.2 | true | 9.50 | B |
| דגניה ב' (il-32.6999-35.5747) | flat | 1280 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 6.66 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1111.4–1120.7 | 395.3–714.2 | false | 8.00 | D |
| כנרת מושבה (il-32.7232-35.5644) | flat | 375 | synagogue | il-synagogue-32.72285-35.56815 | (unnamed) | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 164.6–175.6 | 155.1–214.3 | true | 9.50 | B |
| כנרת מושבה (il-32.7232-35.5644) | flat | 375 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 6.12 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 285.6–294.9 | 155.1–214.3 | false | 8.00 | D |
| כנרת מושבה (il-32.7232-35.5644) | flat | 375 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 16.61 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 298.0–304.2 | 155.1–214.3 | false | 8.00 | D |
| כנרת מושבה (il-32.7232-35.5644) | flat | 1280 | synagogue | il-synagogue-32.72285-35.56815 | (unnamed) | 0.35 | own | near | 9 (HALL_M default (legacy 9m)) | none | 575.1–586.1 | 529.3–731.4 | true | 9.50 | B |
| כנרת מושבה (il-32.7232-35.5644) | flat | 1280 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 6.12 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 986.1–995.4 | 529.3–731.4 | false | 8.00 | D |
| כנרת מושבה (il-32.7232-35.5644) | flat | 1280 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 16.61 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1024.6–1030.8 | 529.3–731.4 | false | 8.00 | D |
| קבוצת כנרת (il-32.7139-35.5625) | flat | 375 | synagogue | il-synagogue-32.71483-35.56341 | (unnamed) | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 128.1–214.6 | true | 9.50 | B |
| קבוצת כנרת (il-32.7139-35.5625) | flat | 375 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 16.21 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 303.1–309.3 | 128.1–214.6 | false | 8.00 | D |
| קבוצת כנרת (il-32.7139-35.5625) | flat | 1280 | synagogue | il-synagogue-32.71483-35.56341 | (unnamed) | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 437.3–732.6 | true | 9.50 | B |
| קבוצת כנרת (il-32.7139-35.5625) | flat | 1280 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 16.21 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1042.0–1048.2 | 437.3–732.6 | false | 8.00 | D |
| מגדים (il-32.7290-34.9620) | flat | 375 | synagogue | il-synagogue-32.73248-34.95797 | שער הרחמים | 0.53 | own | near | 9 (HALL_M default (legacy 9m)) | none | 198.4–209.4 | 140.1–244.6 | true | 9.50 | B |
| מגדים (il-32.7290-34.9620) | flat | 1280 | synagogue | il-synagogue-32.73248-34.95797 | שער הרחמים | 0.53 | own | near | 9 (HALL_M default (legacy 9m)) | none | 690.5–701.5 | 478.2–834.9 | true | 9.50 | B |
| רכסים (il-32.7510-35.1014) | flat | 375 | synagogue | il-synagogue-32.77697-35.02077 | בית כנסת אוהל אהרון | 8.07 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 349.4–358.7 | 118.1–214.1 | false | 8.00 | D |
| רכסים (il-32.7510-35.1014) | flat | 1280 | synagogue | il-synagogue-32.77697-35.02077 | בית כנסת אוהל אהרון | 8.07 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1203.8–1213.0 | 403.0–730.6 | false | 8.00 | D |
| עדי (il-32.7819-35.1736) | flat | 375 | synagogue | il-synagogue-32.78351-35.16915 | (unnamed) | 0.46 | own | near | 9 (HALL_M default (legacy 9m)) | none | 211.1–222.1 | 153.9–218.2 | true | 9.50 | B |
| עדי (il-32.7819-35.1736) | flat | 1280 | synagogue | il-synagogue-32.78351-35.16915 | (unnamed) | 0.46 | own | near | 9 (HALL_M default (legacy 9m)) | none | 734.0–745.0 | 525.3–744.7 | true | 9.50 | B |
| ציפורי (il-32.7443-35.2781) | flat | 375 | minaret | il-minaret-32.73903-35.32387 | (unnamed) | 4.32 | beyond | near | 9 (HALL_M default (legacy 30m)) | 327_353:19:18 (משהד) | 34.1–37.8 | 150.7–264.1 | false | 4.43 | A |
| ציפורי (il-32.7443-35.2781) | flat | 1280 | minaret | il-minaret-32.73903-35.32387 | (unnamed) | 4.32 | beyond | near | 9 (HALL_M default (legacy 30m)) | 327_353:19:18 (משהד) | 120.9–124.5 | 514.5–901.5 | false | 4.43 | A |
| הושעיה (il-32.7586-35.2933) | flat | 375 | synagogue | il-synagogue-32.75883-35.29098 | בית כנסת ספרדי | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 107.7–291.2 | true | 9.50 | B |
| הושעיה (il-32.7586-35.2933) | flat | 1280 | synagogue | il-synagogue-32.75883-35.29098 | בית כנסת ספרדי | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 367.6–993.9 | true | 9.50 | B |
| חנתון (il-32.7839-35.2453) | flat | 375 | synagogue | il-synagogue-32.78441-35.24454 | בית כנסת חנתון | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 130.5–212.5 | true | 9.50 | B |
| חנתון (il-32.7839-35.2453) | flat | 1280 | synagogue | il-synagogue-32.78441-35.24454 | בית כנסת חנתון | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 445.3–725.2 | true | 9.50 | B |
| שרונה (il-32.7255-35.4669) | flat | 375 | minaret | il-minaret-32.70347-35.29766 | المسجد الأبيض | 16.03 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 306.1–312.7 | 115.4–220.1 | false | 8.00 | D |
| שרונה (il-32.7255-35.4669) | flat | 375 | church | il-church-32.74695-35.33865 | כנסיית החתונה | 12.24 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 336.4–342.5 | 115.4–220.1 | false | 8.00 | D |
| שרונה (il-32.7255-35.4669) | flat | 1280 | minaret | il-minaret-32.70347-35.29766 | المسجد الأبيض | 16.03 | other | plain | 9 (HALL_M default (legacy 30m)) | none | 1052.8–1059.4 | 393.7–751.2 | false | 8.00 | D |
| שרונה (il-32.7255-35.4669) | flat | 1280 | church | il-church-32.74695-35.33865 | כנסיית החתונה | 12.24 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1155.6–1161.8 | 393.7–751.2 | false | 8.00 | D |
| הזורעים (il-32.7457-35.5032) | flat | 375 | synagogue | il-synagogue-32.74579-35.50536 | בית כנסת הזורעים | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 162.8–240.5 | true | 9.50 | B |
| הזורעים (il-32.7457-35.5032) | flat | 375 | church | il-church-32.74695-35.33865 | כנסיית החתונה | 15.39 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 320.2–326.4 | 162.8–240.5 | false | 8.00 | D |
| הזורעים (il-32.7457-35.5032) | flat | 1280 | synagogue | il-synagogue-32.74579-35.50536 | בית כנסת הזורעים | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 555.6–821.0 | true | 9.50 | B |
| הזורעים (il-32.7457-35.5032) | flat | 1280 | church | il-church-32.74695-35.33865 | כנסיית החתונה | 15.39 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1100.6–1106.8 | 555.6–821.0 | false | 8.00 | D |
| גבעת אבני (il-32.7745-35.4384) | flat | 375 | synagogue | il-synagogue-32.77616-35.43775 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 72.6–274.9 | true | 9.50 | B |
| גבעת אבני (il-32.7745-35.4384) | flat | 1280 | synagogue | il-synagogue-32.77616-35.43775 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 247.8–938.4 | true | 9.50 | B |
| מצפה (il-32.7903-35.5085) | flat | 375 | synagogue | il-synagogue-32.78196-35.50466 | בית הכנסת מנין אברכים | 0.99 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 129.0–274.2 | true | 9.50 | B |
| מצפה (il-32.7903-35.5085) | flat | 1280 | synagogue | il-synagogue-32.78196-35.50466 | בית הכנסת מנין אברכים | 0.99 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 440.4–935.9 | true | 9.50 | B |
| לביא (il-32.7872-35.4417) | flat | 375 | synagogue | il-synagogue-32.78642-35.44162 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 113.5–290.8 | true | 9.50 | B |
| לביא (il-32.7872-35.4417) | flat | 1280 | synagogue | il-synagogue-32.78642-35.44162 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 387.5–992.7 | true | 9.50 | B |
| פוריה כפר עבודה (il-32.7188-35.5474) | flat | 375 | synagogue | il-synagogue-32.72082-35.54515 | (unnamed) | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 197.7–208.7 | 166.2–210.5 | true | 9.50 | B |
| פוריה כפר עבודה (il-32.7188-35.5474) | flat | 375 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 14.95 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 298.5–304.7 | 166.2–210.5 | false | 8.00 | D |
| פוריה כפר עבודה (il-32.7188-35.5474) | flat | 1280 | synagogue | il-synagogue-32.72082-35.54515 | (unnamed) | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 688.2–699.2 | 567.4–718.6 | true | 9.50 | B |
| פוריה כפר עבודה (il-32.7188-35.5474) | flat | 1280 | church | il-church-32.68626-35.39242 | כנסיית ההשתנות הקתולית | 14.95 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1026.3–1032.4 | 567.4–718.6 | false | 8.00 | D |
| פוריה עילית (il-32.7322-35.5457) | flat | 375 | synagogue | il-synagogue-32.72853-35.54767 | (unnamed) | 0.45 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 91.7–207.4 | true | 9.50 | B |
| פוריה עילית (il-32.7322-35.5457) | flat | 1280 | synagogue | il-synagogue-32.72853-35.54767 | (unnamed) | 0.45 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 313.0–707.9 | true | 9.50 | B |
| פוריה - נווה עובד (il-32.7437-35.5376) | flat | 375 | synagogue | il-synagogue-32.73867-35.53932 | עץ החיים | 0.58 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 93.6–200.1 | true | 9.50 | B |
| פוריה - נווה עובד (il-32.7437-35.5376) | flat | 1280 | synagogue | il-synagogue-32.73867-35.53932 | עץ החיים | 0.58 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 319.5–683.0 | true | 9.50 | B |
| עין גב (il-32.7811-35.6389) | flat | 375 | synagogue | il-synagogue-32.78211-35.64025 | (unnamed) | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 128.1–205.1 | true | 9.50 | B |
| עין גב (il-32.7811-35.6389) | flat | 375 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 15.35 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 266.2–275.5 | 128.1–205.1 | false | 8.00 | D |
| עין גב (il-32.7811-35.6389) | flat | 1280 | synagogue | il-synagogue-32.78211-35.64025 | (unnamed) | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 437.4–700.2 | true | 9.50 | B |
| עין גב (il-32.7811-35.6389) | flat | 1280 | synagogue | il-synagogue-32.70302-35.50359 | בית הכנסת היכל הקודש דחסידי ברסלב | 15.35 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 919.9–929.2 | 437.4–700.2 | false | 8.00 | D |
| נאות גולן (il-32.7867-35.6930) | flat | 375 | synagogue | il-synagogue-32.78591-35.69355 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 82.3–228.6 | true | 9.50 | B |
| נאות גולן (il-32.7867-35.6930) | flat | 1280 | synagogue | il-synagogue-32.78591-35.69355 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 281.1–780.4 | true | 9.50 | B |
| בני יהודה (il-32.7984-35.6902) | flat | 375 | synagogue | il-synagogue-32.79805-35.68838 | (unnamed) | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 102.4–204.0 | true | 9.50 | B |
| בני יהודה (il-32.7984-35.6902) | flat | 1280 | synagogue | il-synagogue-32.79805-35.68838 | (unnamed) | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 349.5–696.3 | true | 9.50 | B |
| מורשת (il-32.8255-35.2323) | flat | 375 | synagogue | il-synagogue-32.82579-35.23283 | היכל הצבי | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 163.0–257.6 | true | 9.50 | B |
| מורשת (il-32.8255-35.2323) | flat | 1280 | synagogue | il-synagogue-32.82579-35.23283 | היכל הצבי | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 556.2–879.2 | true | 9.50 | B |
| אשחר (il-32.8851-35.3002) | flat | 375 | synagogue | il-synagogue-32.88459-35.30185 | מרכז קהילתי ובית כנסת | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 164.7–217.6 | true | 9.50 | B |
| אשחר (il-32.8851-35.3002) | flat | 1280 | synagogue | il-synagogue-32.88459-35.30185 | מרכז קהילתי ובית כנסת | 0.17 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 562.2–742.8 | true | 9.50 | B |
| כרמיאל (il-32.9159-35.2934) | flat | 375 | synagogue | il-synagogue-32.91544-35.29359 | בית חב"ד כרמיאל | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 28.3–254.4 | true | 9.50 | B |
| כרמיאל (il-32.9159-35.2934) | flat | 1280 | synagogue | il-synagogue-32.91544-35.29359 | בית חב"ד כרמיאל | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 96.6–868.4 | true | 9.50 | B |
| שזור (il-32.9327-35.3535) | flat | 375 | synagogue | il-synagogue-32.93333-35.35231 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 110.6–242.8 | true | 9.50 | B |
| שזור (il-32.9327-35.3535) | flat | 375 | synagogue | il-synagogue-32.96816-35.49059 | בית הכנסת האר"י הספרדי | 13.38 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 22.1–31.4 | 110.6–242.8 | false | 8.00 | D |
| שזור (il-32.9327-35.3535) | flat | 1280 | synagogue | il-synagogue-32.93333-35.35231 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 377.4–828.9 | true | 9.50 | B |
| שזור (il-32.9327-35.3535) | flat | 1280 | synagogue | il-synagogue-32.96816-35.49059 | בית הכנסת האר"י הספרדי | 13.38 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 86.7–96.0 | 377.4–828.9 | false | 8.00 | D |
| ליבנים (il-32.8648-35.4956) | flat | 375 | synagogue | il-synagogue-32.86502-35.49655 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 109.5–294.1 | true | 9.50 | B |
| ליבנים (il-32.8648-35.4956) | flat | 1280 | synagogue | il-synagogue-32.86502-35.49655 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 373.6–1003.9 | true | 9.50 | B |
| טפחות (il-32.8683-35.4219) | flat | 375 | synagogue | il-synagogue-32.86837-35.42225 | בית הכנסת המרכזי
שלמה ויעקב פיצ'וטו | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 131.9–219.9 | true | 9.50 | B |
| טפחות (il-32.8683-35.4219) | flat | 375 | synagogue | il-synagogue-32.87084-35.41948 | בית המדרש ע"ש משפחת שטיינברג | 0.36 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 131.9–219.9 | true | 9.50 | B |
| טפחות (il-32.8683-35.4219) | flat | 375 | church | il-church-32.88077-35.55592 | כנסיית הר האושר | 12.59 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 39.9–46.0 | 131.9–219.9 | false | 8.00 | D |
| טפחות (il-32.8683-35.4219) | flat | 1280 | synagogue | il-synagogue-32.86837-35.42225 | בית הכנסת המרכזי
שלמה ויעקב פיצ'וטו | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 450.3–750.6 | true | 9.50 | B |
| טפחות (il-32.8683-35.4219) | flat | 1280 | synagogue | il-synagogue-32.87084-35.41948 | בית המדרש ע"ש משפחת שטיינברג | 0.36 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 450.3–750.6 | true | 9.50 | B |
| טפחות (il-32.8683-35.4219) | flat | 1280 | church | il-church-32.88077-35.55592 | כנסיית הר האושר | 12.59 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 143.5–149.7 | 450.3–750.6 | false | 8.00 | D |
| כלנית (il-32.8750-35.4528) | flat | 375 | synagogue | il-synagogue-32.87481-35.4545 | (unnamed) | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 96.3–284.5 | true | 9.50 | B |
| כלנית (il-32.8750-35.4528) | flat | 1280 | synagogue | il-synagogue-32.87481-35.4545 | (unnamed) | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 328.7–971.3 | true | 9.50 | B |
| חוקוק (il-32.8803-35.4952) | flat | 375 | synagogue | il-synagogue-32.87917-35.49513 | חברותא | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 172.7–234.3 | true | 9.50 | B |
| חוקוק (il-32.8803-35.4952) | flat | 375 | church | il-church-32.8805-35.57538 | פטרוס הקדוש | 7.49 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 49.1–55.3 | 172.7–234.3 | false | 8.00 | D |
| חוקוק (il-32.8803-35.4952) | flat | 1280 | synagogue | il-synagogue-32.87917-35.49513 | חברותא | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 589.4–799.7 | true | 9.50 | B |
| חוקוק (il-32.8803-35.4952) | flat | 1280 | church | il-church-32.8805-35.57538 | פטרוס הקדוש | 7.49 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 175.1–181.3 | 589.4–799.7 | false | 8.00 | D |
| כחל (il-32.8907-35.5118) | flat | 375 | synagogue | il-synagogue-32.89037-35.51163 | (unnamed) | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 111.5–260.4 | true | 9.50 | B |
| כחל (il-32.8907-35.5118) | flat | 375 | church | il-church-32.8805-35.57538 | פטרוס הקדוש | 6.05 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 65.6–71.8 | 111.5–260.4 | false | 8.00 | D |
| כחל (il-32.8907-35.5118) | flat | 1280 | synagogue | il-synagogue-32.89037-35.51163 | (unnamed) | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 380.4–889.0 | true | 9.50 | B |
| כחל (il-32.8907-35.5118) | flat | 1280 | church | il-church-32.8805-35.57538 | פטרוס הקדוש | 6.05 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 231.4–237.6 | 380.4–889.0 | false | 8.00 | D |
| אמנון (il-32.9044-35.5705) | flat | 375 | synagogue | il-synagogue-32.90534-35.57264 | (unnamed) | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 118.7–255.6 | true | 9.50 | B |
| אמנון (il-32.9044-35.5705) | flat | 1280 | synagogue | il-synagogue-32.90534-35.57264 | (unnamed) | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 405.0–872.6 | true | 9.50 | B |
| אבני איתן (il-32.8246-35.7667) | flat | 375 | synagogue | il-synagogue-32.8243-35.76693 | (unnamed) | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 110.4–224.3 | true | 9.50 | B |
| אבני איתן (il-32.8246-35.7667) | flat | 1280 | synagogue | il-synagogue-32.8243-35.76693 | (unnamed) | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 376.9–765.5 | true | 9.50 | B |
| נוב (il-32.8323-35.7832) | flat | 375 | synagogue | il-synagogue-32.83218-35.78381 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 105.7–231.9 | true | 9.50 | B |
| נוב (il-32.8323-35.7832) | flat | 1280 | synagogue | il-synagogue-32.83218-35.78381 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 360.9–791.5 | true | 9.50 | B |
| חיספין (il-32.8451-35.7928) | flat | 375 | synagogue | il-synagogue-32.84544-35.78991 | בית הכנסת המרכזי | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 105.4–208.4 | true | 9.50 | B |
| חיספין (il-32.8451-35.7928) | flat | 1280 | synagogue | il-synagogue-32.84544-35.78991 | בית הכנסת המרכזי | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 359.7–711.2 | true | 9.50 | B |
| נטור (il-32.8538-35.7515) | flat | 375 | synagogue | il-synagogue-32.85387-35.74893 | (unnamed) | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 157.2–212.8 | true | 9.50 | B |
| נטור (il-32.8538-35.7515) | flat | 375 | church | il-church-32.8805-35.57538 | פטרוס הקדוש | 16.71 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 334.8–341.0 | 157.2–212.8 | false | 8.00 | D |
| נטור (il-32.8538-35.7515) | flat | 1280 | synagogue | il-synagogue-32.85387-35.74893 | (unnamed) | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 536.5–726.4 | true | 9.50 | B |
| נטור (il-32.8538-35.7515) | flat | 1280 | church | il-church-32.8805-35.57538 | פטרוס הקדוש | 16.71 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1150.3–1156.5 | 536.5–726.4 | false | 8.00 | D |
| רמת מגשימים (il-32.8440-35.8074) | flat | 375 | synagogue | il-synagogue-32.84409-35.80679 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 116.0–247.4 | true | 9.50 | B |
| רמת מגשימים (il-32.8440-35.8074) | flat | 1280 | synagogue | il-synagogue-32.84409-35.80679 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 395.9–844.3 | true | 9.50 | B |
| בוסתן הגליל (il-32.9494-35.0851) | flat | 375 | minaret | il-minaret-32.92196-35.07064 | מסגד אל-רמל | 3.33 | beyond | near | 9 (HALL_M default (legacy 30m)) | 329_350:56:10 (עכו) | 225.6–228.2 | 141.3–238.7 | true | 3.21 | C |
| בוסתן הגליל (il-32.9494-35.0851) | flat | 1280 | minaret | il-minaret-32.92196-35.07064 | מסגד אל-רמל | 3.33 | beyond | near | 9 (HALL_M default (legacy 30m)) | 329_350:56:10 (עכו) | 773.2–775.9 | 482.4–814.9 | true | 3.21 | C |
| נהריה (il-33.0066-35.0984) | flat | 375 | synagogue | il-synagogue-33.00436-35.10678 | בית הכנסת מגן דוד | 0.82 | own | near | 9 (HALL_M default (legacy 9m)) | none | 157.8–168.8 | 44.8–223.8 | true | 9.50 | B |
| נהריה (il-33.0066-35.0984) | flat | 1280 | synagogue | il-synagogue-33.00436-35.10678 | בית הכנסת מגן דוד | 0.82 | own | near | 9 (HALL_M default (legacy 9m)) | none | 551.9–562.9 | 152.8–763.9 | true | 9.50 | B |
| נהריה (il-33.0063-35.0946) | flat | 375 | synagogue | il-synagogue-33.00436-35.10678 | בית הכנסת מגן דוד | 1.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 147.4–158.4 | 33.2–212.4 | true | 9.50 | B |
| נהריה (il-33.0063-35.0946) | flat | 1280 | synagogue | il-synagogue-33.00436-35.10678 | בית הכנסת מגן דוד | 1.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 516.4–527.4 | 113.4–725.1 | true | 9.50 | B |
| רגבה (il-32.9780-35.0997) | flat | 375 | synagogue | il-synagogue-32.97626-35.09802 | בית כנסת רגבה | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 113.6–216.6 | true | 9.50 | B |
| רגבה (il-32.9780-35.0997) | flat | 1280 | synagogue | il-synagogue-32.97626-35.09802 | בית כנסת רגבה | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 387.8–739.3 | true | 9.50 | B |
| סער (il-33.0294-35.1093) | flat | 375 | synagogue | il-synagogue-33.02455-35.10844 | אוצר התורה | 0.54 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 112.0–236.6 | true | 9.50 | B |
| סער (il-33.0294-35.1093) | flat | 1280 | synagogue | il-synagogue-33.02455-35.10844 | אוצר התורה | 0.54 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 382.4–807.6 | true | 9.50 | B |
| טל-אל (il-32.9279-35.1821) | flat | 375 | synagogue | il-synagogue-32.92576-35.18048 | (unnamed) | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 120.7–288.5 | true | 9.50 | B |
| טל-אל (il-32.9279-35.1821) | flat | 1280 | synagogue | il-synagogue-32.92576-35.18048 | (unnamed) | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 412.1–984.7 | true | 9.50 | B |
| גיתה (il-32.9672-35.2491) | flat | 375 | synagogue | il-synagogue-32.96786-35.24889 | (unnamed) | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 175.0–209.6 | true | 9.50 | B |
| גיתה (il-32.9672-35.2491) | flat | 1280 | synagogue | il-synagogue-32.96786-35.24889 | (unnamed) | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 597.3–715.4 | true | 9.50 | B |
| כפר ורדים (il-32.9957-35.2764) | flat | 375 | synagogue | il-synagogue-32.9949-35.26791 | בית כנסת רפורמי כפר ורדים | 0.80 | own | near | 9 (HALL_M default (legacy 9m)) | none | 209.8–220.8 | 165.2–284.6 | true | 9.50 | B |
| כפר ורדים (il-32.9957-35.2764) | flat | 375 | synagogue | il-synagogue-32.9972-35.27615 | בית כנסת כפר ורדים | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 165.2–284.6 | true | 9.50 | B |
| כפר ורדים (il-32.9957-35.2764) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 13.89 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 15.7–21.8 | 165.2–284.6 | false | 8.00 | D |
| כפר ורדים (il-32.9957-35.2764) | flat | 1280 | synagogue | il-synagogue-32.9949-35.26791 | בית כנסת רפורמי כפר ורדים | 0.80 | own | near | 9 (HALL_M default (legacy 9m)) | none | 729.4–740.4 | 563.7–971.5 | true | 9.50 | B |
| כפר ורדים (il-32.9957-35.2764) | flat | 1280 | synagogue | il-synagogue-32.9972-35.27615 | בית כנסת כפר ורדים | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 563.7–971.5 | true | 9.50 | B |
| כפר ורדים (il-32.9957-35.2764) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 13.89 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 60.9–67.1 | 563.7–971.5 | false | 8.00 | D |
| מעלות תרשיחא (il-33.0157-35.2760) | flat | 375 | synagogue | il-synagogue-33.01319-35.28716 | ישיבת מעלות יעקב | 1.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 140.3–151.3 | 123.3–235.5 | true | 9.50 | B |
| מעלות תרשיחא (il-33.0157-35.2760) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 13.24 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 29.2–35.3 | 123.3–235.5 | false | 8.00 | D |
| מעלות תרשיחא (il-33.0157-35.2760) | flat | 1280 | synagogue | il-synagogue-33.01319-35.28716 | ישיבת מעלות יעקב | 1.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 492.0–503.0 | 420.8–804.0 | true | 9.50 | B |
| מעלות תרשיחא (il-33.0157-35.2760) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 13.24 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 107.0–113.2 | 420.8–804.0 | false | 8.00 | D |
| חוסן (il-32.9976-35.2980) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 11.97 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 11.5–17.7 | 124.6–246.8 | false | 8.00 | D |
| חוסן (il-32.9976-35.2980) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 11.97 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 46.8–52.9 | 425.4–842.4 | false | 8.00 | D |
| כפר חנניה (il-32.9171-35.4233) | flat | 375 | synagogue | il-synagogue-32.9173-35.42445 | אהבת חינם | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 125.0–249.2 | true | 9.50 | B |
| כפר חנניה (il-32.9171-35.4233) | flat | 1280 | synagogue | il-synagogue-32.9173-35.42445 | אהבת חינם | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 426.5–850.5 | true | 9.50 | B |
| שפר (il-32.9439-35.4362) | flat | 375 | synagogue | il-synagogue-32.94336-35.43745 | (unnamed) | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 154.2–205.5 | true | 9.50 | B |
| שפר (il-32.9439-35.4362) | flat | 1280 | synagogue | il-synagogue-32.94336-35.43745 | (unnamed) | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 526.2–701.4 | true | 9.50 | B |
| צפת (il-32.9662-35.4962) | flat | 375 | synagogue | il-synagogue-32.9652-35.49903 | אורות האר"י | 0.29 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 89.9–230.6 | true | 9.50 | B |
| צפת (il-32.9662-35.4962) | flat | 375 | synagogue | il-synagogue-32.96816-35.49059 | בית הכנסת האר"י הספרדי | 0.56 | own | near | 9 (HALL_M default (legacy 9m)) | none | 200.0–211.0 | 89.9–230.6 | true | 9.50 | B |
| צפת (il-32.9662-35.4962) | flat | 1280 | synagogue | il-synagogue-32.9652-35.49903 | אורות האר"י | 0.29 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 307.0–787.0 | true | 9.50 | B |
| צפת (il-32.9662-35.4962) | flat | 1280 | synagogue | il-synagogue-32.96816-35.49059 | בית הכנסת האר"י הספרדי | 0.56 | own | near | 9 (HALL_M default (legacy 9m)) | none | 696.1–707.1 | 307.0–787.0 | true | 9.50 | B |
| ביריה (il-32.9776-35.5007) | flat | 375 | synagogue | il-synagogue-32.97972-35.50428 | קבר בניהו בן יהוידע | 0.41 | own | near | 9 (HALL_M default (legacy 9m)) | none | 169.7–180.7 | 123.9–278.0 | true | 9.50 | B |
| ביריה (il-32.9776-35.5007) | flat | 1280 | synagogue | il-synagogue-32.97972-35.50428 | קבר בניהו בן יהוידע | 0.41 | own | near | 9 (HALL_M default (legacy 9m)) | none | 592.4–603.4 | 423.0–949.0 | true | 9.50 | B |
| מירון (il-32.9886-35.4403) | flat | 375 | synagogue | il-synagogue-32.98079-35.44056 | קבר רבי שמעון בר יוחאי | 0.87 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 167.5–211.5 | true | 9.50 | B |
| מירון (il-32.9886-35.4403) | flat | 375 | synagogue | il-synagogue-33.00541-35.51904 | קבר יונתן בן עוזיאל | 7.58 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 26.5–35.7 | 167.5–211.5 | false | 8.00 | D |
| מירון (il-32.9886-35.4403) | flat | 1280 | synagogue | il-synagogue-32.98079-35.44056 | קבר רבי שמעון בר יוחאי | 0.87 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 571.7–722.0 | true | 9.50 | B |
| מירון (il-32.9886-35.4403) | flat | 1280 | synagogue | il-synagogue-33.00541-35.51904 | קבר יונתן בן עוזיאל | 7.58 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 101.5–110.8 | 571.7–722.0 | false | 8.00 | D |
| בר יוחאי (il-32.9970-35.4481) | flat | 375 | synagogue | il-synagogue-32.99715-35.44966 | אוהל הרשב"י | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 126.9–248.2 | true | 9.50 | B |
| בר יוחאי (il-32.9970-35.4481) | flat | 375 | synagogue | il-synagogue-33.00541-35.51904 | קבר יונתן בן עוזיאל | 6.68 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 35.8–45.0 | 126.9–248.2 | false | 8.00 | D |
| בר יוחאי (il-32.9970-35.4481) | flat | 1280 | synagogue | il-synagogue-32.99715-35.44966 | אוהל הרשב"י | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 433.2–847.3 | true | 9.50 | B |
| בר יוחאי (il-32.9970-35.4481) | flat | 1280 | synagogue | il-synagogue-33.00541-35.51904 | קבר יונתן בן עוזיאל | 6.68 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 133.3–142.5 | 433.2–847.3 | false | 8.00 | D |
| כורזים (il-32.9110-35.5527) | flat | 375 | synagogue | il-synagogue-32.91177-35.54757 | (unnamed) | 0.48 | own | near | 9 (HALL_M default (legacy 9m)) | none | 197.3–208.3 | 147.1–261.8 | true | 9.50 | B |
| כורזים (il-32.9110-35.5527) | flat | 1280 | synagogue | il-synagogue-32.91177-35.54757 | (unnamed) | 0.48 | own | near | 9 (HALL_M default (legacy 9m)) | none | 686.8–697.8 | 502.2–893.7 | true | 9.50 | B |
| אליפלט (il-32.9480-35.5474) | flat | 375 | synagogue | il-synagogue-32.98079-35.44056 | קבר רבי שמעון בר יוחאי | 10.61 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 348.0–357.3 | 121.0–265.3 | false | 8.00 | D |
| אליפלט (il-32.9480-35.5474) | flat | 1280 | synagogue | il-synagogue-32.98079-35.44056 | קבר רבי שמעון בר יוחאי | 10.61 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1199.1–1208.4 | 413.0–905.6 | false | 8.00 | D |
| חצור הגלילית (il-32.9792-35.5433) | flat | 375 | synagogue | il-synagogue-32.97905-35.54579 | שערי שלום | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 115.7–216.0 | true | 9.50 | B |
| חצור הגלילית (il-32.9792-35.5433) | flat | 375 | synagogue | il-synagogue-32.98079-35.44056 | קבר רבי שמעון בר יוחאי | 9.59 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 319.5–328.8 | 115.7–216.0 | false | 8.00 | D |
| חצור הגלילית (il-32.9792-35.5433) | flat | 1280 | synagogue | il-synagogue-32.97905-35.54579 | שערי שלום | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 394.9–737.4 | true | 9.50 | B |
| חצור הגלילית (il-32.9792-35.5433) | flat | 1280 | synagogue | il-synagogue-32.98079-35.44056 | קבר רבי שמעון בר יוחאי | 9.59 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1101.8–1111.1 | 394.9–737.4 | false | 8.00 | D |
| מחניים (il-32.9886-35.5707) | flat | 375 | minaret | il-minaret-32.96693-35.59823 | מסגד א־רחמה | 3.52 | beyond | near | 9 (HALL_M default (legacy 30m)) | 329_355:78:32 (טובא זנגריה) | 97.2–100.0 | 162.2–234.1 | false | 3.38 | A |
| מחניים (il-32.9886-35.5707) | flat | 375 | synagogue | il-synagogue-32.98079-35.44056 | קבר רבי שמעון בר יוחאי | 12.17 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 311.8–321.0 | 162.2–234.1 | false | 8.00 | D |
| מחניים (il-32.9886-35.5707) | flat | 1280 | minaret | il-minaret-32.96693-35.59823 | מסגד א־רחמה | 3.52 | beyond | near | 9 (HALL_M default (legacy 30m)) | 329_355:78:32 (טובא זנגריה) | 335.1–337.9 | 553.7–799.0 | false | 3.38 | A |
| מחניים (il-32.9886-35.5707) | flat | 1280 | synagogue | il-synagogue-32.98079-35.44056 | קבר רבי שמעון בר יוחאי | 12.17 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1075.3–1084.6 | 553.7–799.0 | false | 8.00 | D |
| חד נס (il-32.9284-35.6430) | flat | 375 | synagogue | il-synagogue-32.92878-35.64248 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 193.2–225.4 | true | 9.50 | B |
| חד נס (il-32.9284-35.6430) | flat | 1280 | synagogue | il-synagogue-32.92878-35.64248 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 607.8–769.2 | true | 9.50 | B |
| כרכום (il-32.9293-35.6086) | flat | 375 | synagogue | il-synagogue-32.92985-35.6091 | ברית יצחק | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 171.3–214.3 | true | 9.50 | B |
| כרכום (il-32.9293-35.6086) | flat | 375 | synagogue | il-synagogue-32.96816-35.49059 | בית הכנסת האר"י הספרדי | 11.82 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 350.0–359.3 | 171.3–214.3 | false | 8.00 | D |
| כרכום (il-32.9293-35.6086) | flat | 1280 | synagogue | il-synagogue-32.92985-35.6091 | ברית יצחק | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 584.7–731.4 | true | 9.50 | B |
| כרכום (il-32.9293-35.6086) | flat | 1280 | synagogue | il-synagogue-32.96816-35.49059 | בית הכנסת האר"י הספרדי | 11.82 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1206.0–1215.3 | 584.7–731.4 | false | 8.00 | D |
| קצרין (il-32.9920-35.6877) | flat | 375 | synagogue | il-synagogue-32.99019-35.67627 | אוהל הנחלים | 1.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 218.2–229.2 | 97.2–229.5 | true | 9.50 | B |
| קצרין (il-32.9920-35.6877) | flat | 375 | synagogue | il-synagogue-32.99115-35.68703 | בית כנסת הספרדי המרכזי | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 97.2–229.5 | true | 9.50 | B |
| קצרין (il-32.9920-35.6877) | flat | 1280 | synagogue | il-synagogue-32.99019-35.67627 | אוהל הנחלים | 1.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 757.9–768.9 | 331.9–783.5 | true | 9.50 | B |
| קצרין (il-32.9920-35.6877) | flat | 1280 | synagogue | il-synagogue-32.99115-35.68703 | בית כנסת הספרדי המרכזי | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 331.9–783.5 | true | 9.50 | B |
| יונתן (il-32.9385-35.7950) | flat | 375 | synagogue | il-synagogue-32.93738-35.79456 | בית כנסת יונתן | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 161.5–221.6 | true | 9.50 | B |
| יונתן (il-32.9385-35.7950) | flat | 1280 | synagogue | il-synagogue-32.93738-35.79456 | בית כנסת יונתן | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 551.4–756.5 | true | 9.50 | B |
| קשת (il-32.9807-35.8086) | flat | 375 | synagogue | il-synagogue-32.98052-35.80922 | בית כנסת קשת | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 83.4–225.7 | true | 9.50 | B |
| קשת (il-32.9807-35.8086) | flat | 1280 | synagogue | il-synagogue-32.98052-35.80922 | בית כנסת קשת | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 284.6–770.3 | true | 9.50 | B |
| נווה זיו (il-33.0276-35.1835) | flat | 375 | synagogue | il-synagogue-33.02767-35.181 | (unnamed) | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 110.8–239.3 | true | 9.50 | B |
| נווה זיו (il-33.0276-35.1835) | flat | 1280 | synagogue | il-synagogue-33.02767-35.181 | (unnamed) | 0.23 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 378.3–816.7 | true | 9.50 | B |
| מנות (il-33.0384-35.1947) | flat | 375 | synagogue | il-synagogue-33.03827-35.19506 | (unnamed) | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 150.3–210.6 | true | 9.50 | B |
| מנות (il-33.0384-35.1947) | flat | 375 | synagogue | il-synagogue-33.01319-35.28716 | ישיבת מעלות יעקב | 9.06 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 74.8–84.1 | 150.3–210.6 | false | 8.00 | D |
| מנות (il-33.0384-35.1947) | flat | 1280 | synagogue | il-synagogue-33.03827-35.19506 | (unnamed) | 0.04 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 513.0–718.7 | true | 9.50 | B |
| מנות (il-33.0384-35.1947) | flat | 1280 | synagogue | il-synagogue-33.01319-35.28716 | ישיבת מעלות יעקב | 9.06 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 266.5–275.8 | 513.0–718.7 | false | 8.00 | D |
| עבדון (il-33.0480-35.1794) | flat | 375 | synagogue | il-synagogue-33.04764-35.18043 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 122.5–214.9 | true | 9.50 | B |
| עבדון (il-33.0480-35.1794) | flat | 1280 | synagogue | il-synagogue-33.04764-35.18043 | (unnamed) | 0.10 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 418.0–733.4 | true | 9.50 | B |
| לימן (il-33.0595-35.1130) | flat | 375 | synagogue | il-synagogue-33.05941-35.11357 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 153.4–230.3 | true | 9.50 | B |
| לימן (il-33.0595-35.1130) | flat | 1280 | synagogue | il-synagogue-33.05941-35.11357 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 523.6–786.2 | true | 9.50 | B |
| מצובה (il-33.0629-35.1571) | flat | 375 | synagogue | il-synagogue-33.06267-35.15762 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 144.5–225.3 | true | 9.50 | B |
| מצובה (il-33.0629-35.1571) | flat | 1280 | synagogue | il-synagogue-33.06267-35.15762 | (unnamed) | 0.06 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 493.4–768.9 | true | 9.50 | B |
| יערה (il-33.0674-35.1859) | flat | 375 | synagogue | il-synagogue-33.06745-35.18658 | (unnamed) | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 139.1–245.6 | true | 9.50 | B |
| יערה (il-33.0674-35.1859) | flat | 1280 | synagogue | il-synagogue-33.06745-35.18658 | (unnamed) | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 474.8–838.3 | true | 9.50 | B |
| ראש הנקרה (il-33.0857-35.1151) | flat | 375 | synagogue | il-synagogue-33.08606-35.11982 | (unnamed) | 0.44 | own | near | 9 (HALL_M default (legacy 9m)) | none | 165.5–176.5 | 162.7–232.6 | true | 9.50 | B |
| ראש הנקרה (il-33.0857-35.1151) | flat | 1280 | synagogue | il-synagogue-33.08606-35.11982 | (unnamed) | 0.44 | own | near | 9 (HALL_M default (legacy 9m)) | none | 578.3–589.3 | 555.4–793.9 | true | 9.50 | B |
| חניתה (il-33.0874-35.1733) | flat | 375 | synagogue | il-synagogue-33.08801-35.17405 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 111.9–232.0 | true | 9.50 | B |
| חניתה (il-33.0874-35.1733) | flat | 1280 | synagogue | il-synagogue-33.08801-35.17405 | (unnamed) | 0.09 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 381.9–792.1 | true | 9.50 | B |
| עין יעקב (il-33.0095-35.2293) | flat | 375 | synagogue | il-synagogue-33.00838-35.22964 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 161.6–280.2 | true | 9.50 | B |
| עין יעקב (il-33.0095-35.2293) | flat | 1280 | synagogue | il-synagogue-33.00838-35.22964 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 551.5–956.4 | true | 9.50 | B |
| גורן (il-33.0564-35.2370) | flat | 375 | synagogue | il-synagogue-33.05738-35.23612 | (unnamed) | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 161.9–240.0 | true | 9.50 | B |
| גורן (il-33.0564-35.2370) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 16.57 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 56.8–63.0 | 161.9–240.0 | false | 8.00 | D |
| גורן (il-33.0564-35.2370) | flat | 1280 | synagogue | il-synagogue-33.05738-35.23612 | (unnamed) | 0.14 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 552.5–819.2 | true | 9.50 | B |
| גורן (il-33.0564-35.2370) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 16.57 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 201.3–207.5 | 552.5–819.2 | false | 8.00 | D |
| אבן מנחם (il-33.0736-35.2941) | flat | 375 | synagogue | il-synagogue-33.07401-35.29447 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 144.4–230.4 | true | 9.50 | B |
| אבן מנחם (il-33.0736-35.2941) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 11.67 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 74.4–80.6 | 144.4–230.4 | false | 8.00 | D |
| אבן מנחם (il-33.0736-35.2941) | flat | 1280 | synagogue | il-synagogue-33.07401-35.29447 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 492.9–786.5 | true | 9.50 | B |
| אבן מנחם (il-33.0736-35.2941) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 11.67 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 261.4–267.6 | 492.9–786.5 | false | 8.00 | D |
| זרעית (il-33.0996-35.2886) | flat | 375 | synagogue | il-synagogue-33.09967-35.28934 | (unnamed) | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 167.8–240.8 | true | 9.50 | B |
| זרעית (il-33.0996-35.2886) | flat | 1280 | synagogue | il-synagogue-33.09967-35.28934 | (unnamed) | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 572.9–822.0 | true | 9.50 | B |
| אלקוש (il-33.0342-35.3242) | flat | 375 | synagogue | il-synagogue-33.03271-35.32257 | (unnamed) | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 149.0–226.3 | true | 9.50 | B |
| אלקוש (il-33.0342-35.3242) | flat | 375 | synagogue | il-synagogue-33.02156-35.28782 | חב"ד | 3.67 | beyond | near | 9 (HALL_M default (legacy 9m)) | 330_352:70:10 (מעלות תרשיחא) | 347.2–352.2 | 149.0–226.3 | false | 4.31 | A |
| אלקוש (il-33.0342-35.3242) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 8.45 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 38.8–45.0 | 149.0–226.3 | false | 8.00 | D |
| אלקוש (il-33.0342-35.3242) | flat | 1280 | synagogue | il-synagogue-33.03271-35.32257 | (unnamed) | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 508.6–772.4 | true | 9.50 | B |
| אלקוש (il-33.0342-35.3242) | flat | 1280 | synagogue | il-synagogue-33.02156-35.28782 | חב"ד | 3.67 | beyond | near | 9 (HALL_M default (legacy 9m)) | 330_352:70:10 (מעלות תרשיחא) | 1191.1–1196.1 | 508.6–772.4 | false | 4.31 | A |
| אלקוש (il-33.0342-35.3242) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 8.45 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 139.9–146.1 | 508.6–772.4 | false | 8.00 | D |
| נטועה (il-33.0649-35.3233) | flat | 375 | synagogue | il-synagogue-33.06341-35.32151 | (unnamed) | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 132.4–202.4 | true | 9.50 | B |
| נטועה (il-33.0649-35.3233) | flat | 1280 | synagogue | il-synagogue-33.06341-35.32151 | (unnamed) | 0.24 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 451.9–690.9 | true | 9.50 | B |
| שתולה (il-33.0848-35.3143) | flat | 375 | synagogue | il-synagogue-33.08492-35.31483 | בית כנסת חכם ניסים | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 91.9–208.6 | true | 9.50 | B |
| שתולה (il-33.0848-35.3143) | flat | 1280 | synagogue | il-synagogue-33.08492-35.31483 | בית כנסת חכם ניסים | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 313.7–712.0 | true | 9.50 | B |
| אור הגנוז (il-33.0051-35.4475) | flat | 375 | synagogue | il-synagogue-33.00541-35.51904 | קבר יונתן בן עוזיאל | 6.67 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 47.4–56.6 | 170.8–234.6 | false | 8.00 | D |
| אור הגנוז (il-33.0051-35.4475) | flat | 375 | synagogue | il-synagogue-33.01319-35.28716 | ישיבת מעלות יעקב | 14.98 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 323.1–332.4 | 170.8–234.6 | false | 8.00 | D |
| אור הגנוז (il-33.0051-35.4475) | flat | 1280 | synagogue | il-synagogue-33.00541-35.51904 | קבר יונתן בן עוזיאל | 6.67 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 172.9–182.1 | 583.1–800.8 | false | 8.00 | D |
| אור הגנוז (il-33.0051-35.4475) | flat | 1280 | synagogue | il-synagogue-33.01319-35.28716 | ישיבת מעלות יעקב | 14.98 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1114.1–1123.3 | 583.1–800.8 | false | 8.00 | D |
| דלתון (il-33.0167-35.4892) | flat | 375 | synagogue | il-synagogue-33.0162-35.48967 | אוהל יצחק | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 164.5–275.2 | true | 9.50 | B |
| דלתון (il-33.0167-35.4892) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 7.61 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 354.0–360.2 | 164.5–275.2 | false | 8.00 | D |
| דלתון (il-33.0167-35.4892) | flat | 1280 | synagogue | il-synagogue-33.0162-35.48967 | אוהל יצחק | 0.07 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 561.4–939.3 | true | 9.50 | B |
| דלתון (il-33.0167-35.4892) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 7.61 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1215.9–1222.1 | 561.4–939.3 | false | 8.00 | D |
| כרם בן זמרה (il-33.0389-35.4680) | flat | 375 | synagogue | il-synagogue-33.03881-35.46973 | (unnamed) | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 134.9–225.2 | true | 9.50 | B |
| כרם בן זמרה (il-33.0389-35.4680) | flat | 1280 | synagogue | il-synagogue-33.03881-35.46973 | (unnamed) | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 460.5–768.7 | true | 9.50 | B |
| עלמה (il-33.0521-35.4988) | flat | 375 | synagogue | il-synagogue-33.05122-35.49962 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 157.4–226.4 | true | 9.50 | B |
| עלמה (il-33.0521-35.4988) | flat | 1280 | synagogue | il-synagogue-33.05122-35.49962 | (unnamed) | 0.13 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 537.3–772.8 | true | 9.50 | B |
| אביבים (il-33.0887-35.4729) | flat | 375 | synagogue | il-synagogue-33.08952-35.47108 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 173.5–250.7 | true | 9.50 | B |
| אביבים (il-33.0887-35.4729) | flat | 1280 | synagogue | il-synagogue-33.08952-35.47108 | (unnamed) | 0.20 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 592.2–855.8 | true | 9.50 | B |
| משמר הירדן (il-33.0056-35.6003) | flat | 375 | synagogue | il-synagogue-33.00456-35.59713 | (unnamed) | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 195.8–206.8 | 163.9–225.9 | true | 9.50 | B |
| משמר הירדן (il-33.0056-35.6003) | flat | 375 | synagogue | il-synagogue-33.00541-35.51904 | קבר יונתן בן עוזיאל | 7.57 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 317.7–327.0 | 163.9–225.9 | false | 8.00 | D |
| משמר הירדן (il-33.0056-35.6003) | flat | 1280 | synagogue | il-synagogue-33.00456-35.59713 | (unnamed) | 0.31 | own | near | 9 (HALL_M default (legacy 9m)) | none | 681.5–692.5 | 559.6–771.0 | true | 9.50 | B |
| משמר הירדן (il-33.0056-35.6003) | flat | 1280 | synagogue | il-synagogue-33.00541-35.51904 | קבר יונתן בן עוזיאל | 7.57 | other | plain | 9 (HALL_M default (legacy 9m)) | none | 1095.6–1104.9 | 559.6–771.0 | false | 8.00 | D |
| שדה אליעזר (il-33.0459-35.5641) | flat | 375 | synagogue | il-synagogue-33.04551-35.5644 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 99.1–230.0 | true | 9.50 | B |
| שדה אליעזר (il-33.0459-35.5641) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 13.98 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 317.8–324.0 | 99.1–230.0 | false | 8.00 | D |
| שדה אליעזר (il-33.0459-35.5641) | flat | 1280 | synagogue | il-synagogue-33.04551-35.5644 | (unnamed) | 0.05 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 338.2–785.2 | true | 9.50 | B |
| שדה אליעזר (il-33.0459-35.5641) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 13.98 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 1092.3–1098.5 | 338.2–785.2 | false | 8.00 | D |
| דישון (il-33.0813-35.5175) | flat | 375 | synagogue | il-synagogue-33.08181-35.51812 | (unnamed) | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 104.5–203.7 | true | 9.50 | B |
| דישון (il-33.0813-35.5175) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 10.51 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 284.1–290.2 | 104.5–203.7 | false | 8.00 | D |
| דישון (il-33.0813-35.5175) | flat | 1280 | synagogue | il-synagogue-33.08181-35.51812 | (unnamed) | 0.08 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 356.7–695.4 | true | 9.50 | B |
| דישון (il-33.0813-35.5175) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 10.51 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 977.0–983.2 | 356.7–695.4 | false | 8.00 | D |
| רמות נפתלי (il-33.1023-35.5531) | flat | 375 | synagogue | il-synagogue-33.10301-35.55213 | קול אליהו | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 93.0–216.1 | true | 9.50 | B |
| רמות נפתלי (il-33.1023-35.5531) | flat | 375 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 14.51 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 279.3–285.5 | 93.0–216.1 | false | 8.00 | D |
| רמות נפתלי (il-33.1023-35.5531) | flat | 1280 | synagogue | il-synagogue-33.10301-35.55213 | קול אליהו | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 317.4–737.6 | true | 9.50 | B |
| רמות נפתלי (il-33.1023-35.5531) | flat | 1280 | church | il-church-33.04347-35.41413 | Church of our Lady of Baram | 14.51 | other | plain | 9 (HALL_M default (legacy 25m)) | none | 960.7–966.9 | 317.4–737.6 | false | 8.00 | D |
| אלוני הבשן (il-33.0441-35.8392) | flat | 375 | synagogue | il-synagogue-33.04451-35.8408 | בית כנסת ישיבה תיכונית אלוני הבשן | 0.15 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 128.8–233.5 | true | 9.50 | B |
| אלוני הבשן (il-33.0441-35.8392) | flat | 1280 | synagogue | il-synagogue-33.04451-35.8408 | בית כנסת ישיבה תיכונית אלוני הבשן | 0.15 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 439.7–797.1 | true | 9.50 | B |
| קרית שמונה (il-33.2075-35.5708) | flat | 375 | synagogue | il-synagogue-33.20791-35.57375 | (unnamed) | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 99.6–210.0 | true | 9.50 | B |
| קרית שמונה (il-33.2075-35.5708) | flat | 375 | synagogue | il-synagogue-33.2095-35.56665 | אוהל יעקב | 0.45 | own | near | 9 (HALL_M default (legacy 9m)) | none | 195.6–206.6 | 99.6–210.0 | true | 9.50 | B |
| קרית שמונה (il-33.2075-35.5708) | flat | 1280 | synagogue | il-synagogue-33.20791-35.57375 | (unnamed) | 0.28 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 340.0–716.7 | true | 9.50 | B |
| קרית שמונה (il-33.2075-35.5708) | flat | 1280 | synagogue | il-synagogue-33.2095-35.56665 | אוהל יעקב | 0.45 | own | near | 9 (HALL_M default (legacy 9m)) | none | 680.9–691.9 | 340.0–716.7 | true | 9.50 | B |
| גונן (il-33.1239-35.6463) | flat | 375 | synagogue | il-synagogue-33.12547-35.64712 | אוהל אברהם | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 165.8–209.0 | true | 9.50 | B |
| גונן (il-33.1239-35.6463) | flat | 1280 | synagogue | il-synagogue-33.12547-35.64712 | אוהל אברהם | 0.19 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 566.0–713.3 | true | 9.50 | B |
| קלע אלון (il-33.1308-35.6825) | flat | 375 | synagogue | il-synagogue-33.13059-35.68277 | (unnamed) | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 164.4–220.3 | true | 9.50 | B |
| קלע אלון (il-33.1308-35.6825) | flat | 1280 | synagogue | il-synagogue-33.13059-35.68277 | (unnamed) | 0.03 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 561.0–752.0 | true | 9.50 | B |
| כפר בלום (il-33.1724-35.6101) | flat | 375 | synagogue | il-synagogue-33.17111-35.6089 | (unnamed) | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 150.9–224.2 | true | 9.50 | B |
| כפר בלום (il-33.1724-35.6101) | flat | 1280 | synagogue | il-synagogue-33.17111-35.6089 | (unnamed) | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 515.0–765.3 | true | 9.50 | B |
| שדה נחמיה (il-33.1869-35.6245) | flat | 375 | synagogue | il-synagogue-33.18579-35.62585 | מורשת תמר | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 165.2–276.7 | true | 9.50 | B |
| שדה נחמיה (il-33.1869-35.6245) | flat | 1280 | synagogue | il-synagogue-33.18579-35.62585 | מורשת תמר | 0.18 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 563.9–944.6 | true | 9.50 | B |
| בית הלל (il-33.2083-35.6069) | flat | 375 | synagogue | il-synagogue-33.20632-35.60697 | (unnamed) | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 142.5–276.1 | true | 9.50 | B |
| בית הלל (il-33.2083-35.6069) | flat | 1280 | synagogue | il-synagogue-33.20632-35.60697 | (unnamed) | 0.22 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 486.3–942.3 | true | 9.50 | B |
| שעל (il-33.1166-35.7187) | flat | 375 | synagogue | il-synagogue-33.11687-35.71705 | בית כנסת שעל | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 194.0–205.0 | 128.5–203.4 | true | 9.50 | B |
| שעל (il-33.1166-35.7187) | flat | 1280 | synagogue | il-synagogue-33.11687-35.71705 | בית כנסת שעל | 0.16 | own | near | 9 (HALL_M default (legacy 9m)) | none | 675.5–686.5 | 438.6–694.3 | true | 9.50 | B |
| מרגליות (il-33.2148-35.5445) | flat | 375 | synagogue | il-synagogue-33.2159-35.5446 | (unnamed) | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 160.6–286.4 | true | 9.50 | B |
| מרגליות (il-33.2148-35.5445) | flat | 1280 | synagogue | il-synagogue-33.2159-35.5446 | (unnamed) | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 548.3–977.7 | true | 9.50 | B |
| כפר יובל (il-33.2474-35.5975) | flat | 375 | synagogue | il-synagogue-33.24736-35.59865 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 171.3–237.6 | true | 9.50 | B |
| כפר יובל (il-33.2474-35.5975) | flat | 1280 | synagogue | il-synagogue-33.24736-35.59865 | (unnamed) | 0.11 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 584.7–811.1 | true | 9.50 | B |
| מטולה (il-33.2800-35.5780) | flat | 375 | synagogue | il-synagogue-33.2793-35.57898 | בית הכנסת הישן מטולה | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 170.0–181.0 | 162.7–257.8 | true | 9.50 | B |
| מטולה (il-33.2800-35.5780) | flat | 1280 | synagogue | il-synagogue-33.2793-35.57898 | בית הכנסת הישן מטולה | 0.12 | own | near | 9 (HALL_M default (legacy 9m)) | none | 593.5–604.5 | 555.3–879.8 | true | 9.50 | B |
| כרמי צור (osm:way:462664109, production) | recorded | 375 | minaret | il-minaret-31.58592-35.10681 | ديوان آل الواوي (Halhul mosque) | 2.65 | beyond | near | 17 (tagged) | 315_351:5:41 (Halhul) | 166.6–169.8 | 156.8–221.2 | true | 3.90 | C |

## Other places and synagogue-only places with no drawn glyphs

| Place | Terrain | Class | 375 px | 1280 px |
| --- | --- | --- | --- | --- |
| תל אביב (tel-aviv) | recorded | mixed | church 1 | church 1 |
| ירושלים (jerusalem) | recorded | mixed | minaret 1, westernWall 1 | minaret 1, westernWall 1 |
| חיפה (haifa) | recorded | mixed | babShrine 1, synagogue 1 | babShrine 1, synagogue 1 |
| מכתש רמון (ramon-crater) | recorded | none | 0 | 0 |
| טבריה (tiberias) | recorded | mixed | 0 | 0 |
| עין גדי (ein-gedi) | recorded | none | 0 | 0 |
| באר שבע (beer-sheva) | recorded | mixed | synagogue 1 | synagogue 1 |
| מצדה (masada) | recorded | none | 0 | 0 |
| נהלל (nahalal) | recorded | synagogue-only | 0 | 0 |
| יריחו (jericho) | recorded | mosque+church | church 1, minaret 2 | church 1, minaret 2 |
| קליה (kalya) | recorded | none | 0 | 0 |
| נווה זוהר (neve-zohar) | recorded | none | 0 | 0 |
| אילות (il-29.5812-34.9627) | flat | none | 0 | 0 |
| באר אורה (il-29.7102-34.9866) | flat | none | 0 | 0 |
| אליפז (il-29.7964-35.0119) | flat | none | 0 | 0 |
| סמר (il-29.8334-35.0227) | flat | none | 0 | 0 |
| יטבתה (il-29.8959-35.0596) | flat | none | 0 | 0 |
| שחרות (il-29.9037-34.9992) | flat | none | 0 | 0 |
| גרופית (il-29.9417-35.0642) | flat | none | 0 | 0 |
| קטורה (il-29.9696-35.0611) | flat | none | 0 | 0 |
| לוטן (il-29.9868-35.0886) | flat | none | 0 | 0 |
| נווה חריף (il-30.0389-35.0359) | flat | none | 0 | 0 |
| נאות סמדר (il-30.0486-35.0257) | flat | none | 0 | 0 |
| יהל (il-30.0819-35.1288) | flat | none | 0 | 0 |
| שיטים (il-30.1768-35.0165) | flat | none | 0 | 0 |
| פארן (il-30.3626-35.1539) | flat | none | 0 | 0 |
| צוקים (il-30.4910-35.1659) | flat | none | 0 | 0 |
| צופר (il-30.5586-35.1801) | flat | none | 0 | 0 |
| ואדי אריכא (il-30.6869-34.7828) | flat | none | 0 | 0 |
| ספיר (il-30.6141-35.1846) | flat | none | 0 | 0 |
| עין יהב (il-30.6569-35.2382) | flat | none | 0 | 0 |
| עזוז (il-30.7917-34.4722) | flat | none | 0 | 0 |
| עבדה (il-30.7522-34.7765) | flat | none | 0 | 0 |
| חצבה (il-30.7677-35.2796) | flat | none | 0 | 0 |
| עין חצבה (il-30.7983-35.2464) | flat | none | 0 | 0 |
| ניצני סיני (il-30.9039-34.3969) | flat | none | 0 | 0 |
| ניצנה (il-30.8863-34.4219) | flat | none | 0 | 0 |
| עבדה (il-30.8096-34.7561) | flat | none | 0 | 0 |
| אל-בקאר (il-30.8490-34.7363) | flat | none | 0 | 0 |
| שדה בוקר (il-30.8737-34.7926) | flat | none | 0 | 0 |
| מרחב עם (il-30.8886-34.8289) | flat | none | 0 | 0 |
| כמהין (il-30.9100-34.4310) | flat | none | 0 | 0 |
| באר מילכה (il-30.9328-34.4070) | flat | none | 0 | 0 |
| אשלים (il-30.9639-34.7003) | flat | none | 0 | 0 |
| טללים (il-30.9919-34.7701) | flat | none | 0 | 0 |
| ירוחם (il-30.9888-34.9251) | flat | synagogue-only | 0 | 0 |
| ישוב בדואי (il-30.9854-34.9618) | flat | none | 0 | 0 |
| עין תמר (il-30.9433-35.3747) | flat | none | 0 | 0 |
| ביר הדאג' (il-31.0263-34.7031) | flat | none | 0 | 0 |
| שיזף (il-31.0017-34.7655) | flat | none | 0 | 0 |
| משאבי שדה (il-31.0033-34.7861) | flat | none | 0 | 0 |
| רביבים (il-31.0432-34.7207) | flat | none | 0 | 0 |
| רח'מה (il-31.0086-34.9557) | flat | none | 0 | 0 |
| קצר א סיר (il-31.0794-34.9849) | flat | none | 0 | 0 |
| הוואשלה (il-31.0934-34.9774) | flat | none | 0 | 0 |
| דימונה (il-31.0687-35.0367) | flat | synagogue-only | 0 | 0 |
| שלומית (il-31.1685-34.3036) | flat | none | 0 | 0 |
| אבשלום (il-31.1951-34.3308) | flat | none | 0 | 0 |
| צאלים (il-31.2037-34.5338) | flat | none | 0 | 0 |
| אל דנפירי (il-31.1315-34.8164) | flat | none | 0 | 0 |
| אבו עפאש (il-31.1606-34.8074) | flat | none | 0 | 0 |
| שגב שלום (il-31.2009-34.8401) | flat | mosque-only | minaret 1 | minaret 1 |
| אום מיתנאן (il-31.1262-34.9693) | flat | none | 0 | 0 |
| אבו עשיבה (il-31.1249-34.9587) | flat | none | 0 | 0 |
| אל ע'ול (il-31.1243-34.9965) | flat | none | 0 | 0 |
| אבו עמאר (il-31.1374-34.9533) | flat | none | 0 | 0 |
| גינדל (il-31.1328-35.0122) | flat | none | 0 | 0 |
| אל עמראני (il-31.1679-34.9685) | flat | none | 0 | 0 |
| אבו ג'אמדה (il-31.1655-34.9804) | flat | none | 0 | 0 |
| אבו עמר (il-31.1857-34.9652) | flat | none | 0 | 0 |
| בית פלט (il-31.1859-34.9357) | flat | none | 0 | 0 |
| אבו תלול (il-31.1862-34.9128) | flat | none | 0 | 0 |
| المزرة (il-31.1503-35.0805) | flat | none | 0 | 0 |
| אל-קטמאת (il-31.1731-35.0950) | flat | none | 0 | 0 |
| עין בוקק (il-31.2014-35.3639) | flat | none | 0 | 0 |
| כרם שלום (il-31.2277-34.2839) | flat | none | 0 | 0 |
| יתד (il-31.2060-34.3274) | flat | none | 0 | 0 |
| חולית (il-31.2319-34.3265) | flat | none | 0 | 0 |
| סופה (il-31.2365-34.3426) | flat | none | 0 | 0 |
| ניר יצחק (il-31.2379-34.3578) | flat | none | 0 | 0 |
| ישע (il-31.2464-34.4032) | flat | none | 0 | 0 |
| מבטחים (il-31.2418-34.4073) | flat | none | 0 | 0 |
| עמיעוז (il-31.2483-34.4140) | flat | none | 0 | 0 |
| גבולות (il-31.2111-34.4652) | flat | none | 0 | 0 |
| שדה ניצן (il-31.2285-34.4174) | flat | none | 0 | 0 |
| צוחר (il-31.2361-34.4271) | flat | none | 0 | 0 |
| תלמי אליהו (il-31.2300-34.4295) | flat | none | 0 | 0 |
| אוהד (il-31.2377-34.4305) | flat | none | 0 | 0 |
| עין הבשור (il-31.2806-34.4438) | flat | none | 0 | 0 |
| מגן (il-31.2991-34.4289) | flat | none | 0 | 0 |
| פדויים (il-31.3277-34.6121) | flat | none | 0 | 0 |
| רנן (il-31.3378-34.6005) | flat | none | 0 | 0 |
| חצרים (il-31.2404-34.7151) | flat | none | 0 | 0 |
| כפר רפאל (il-31.2588-34.7480) | flat | synagogue-only | 0 | 0 |
| תל שבע (il-31.2457-34.8578) | flat | mosque-only | minaret 1 | minaret 1 |
| אבו רוקייק (il-31.2599-34.8638) | flat | mosque-only | 0 | 0 |
| עומר (il-31.2659-34.8476) | flat | synagogue-only | 0 | 0 |
| אום בטין (il-31.2758-34.8839) | flat | none | minaret 1 | minaret 1 |
| תראבין א-צאנע (il-31.2805-34.8737) | flat | none | 0 | 0 |
| אטרש (il-31.2540-34.9684) | flat | none | 0 | 0 |
| סרעיאה (il-31.2621-34.9696) | flat | none | 0 | 0 |
| ח'רבת אל-ווטן (il-31.2554-34.9238) | flat | none | 0 | 0 |
| סעווה (il-31.2702-34.9613) | flat | none | 0 | 0 |
| אל סייד (il-31.2833-34.9130) | flat | none | 0 | 0 |
| סייד (il-31.2812-34.9318) | flat | none | 0 | 0 |
| עוקבי (il-31.2844-34.9300) | flat | none | 0 | 0 |
| חורה (il-31.2972-34.9379) | flat | mosque-only | minaret 1 | minaret 1 |
| כסיפה (il-31.2465-35.0931) | flat | mosque-only | minaret 2 | minaret 2 |
| נצאצרה (il-31.2430-35.0302) | flat | none | 0 | 0 |
| אל-באט (il-31.2705-35.0332) | flat | none | 0 | 0 |
| דריג'את (il-31.3006-35.0754) | flat | none | 0 | 0 |
| ג'נאביב (il-31.2874-35.1082) | flat | none | 0 | 0 |
| תל ערד (il-31.2919-35.1453) | flat | none | 0 | 0 |
| קבועה (il-31.2252-35.2171) | flat | none | 0 | 0 |
| אל-מַוַ֫ואסִי (il-31.3551-34.2611) | flat | mosque-only | minaret 3 | minaret 3 |
| אל-קרארה (il-31.3783-34.3355) | flat | mosque-only | minaret 3 | minaret 3 |
| דיר אל-בלאח (il-31.4184-34.3503) | flat | mosque-only | minaret 3 | minaret 3 |
| ואדי א-סלקה (il-31.4001-34.3381) | flat | mosque-only | minaret 2 | minaret 2 |
| א-זאוואידה (il-31.4280-34.3653) | flat | mosque-only | minaret 3 | minaret 3 |
| נוסיראת (il-31.4491-34.3931) | flat | mosque-only | minaret 4 | minaret 4 |
| אל-מוסדר (il-31.4150-34.3764) | flat | mosque-only | minaret 3 | minaret 3 |
| אל-בורייג' (il-31.4419-34.4032) | flat | mosque-only | minaret 4 | minaret 4 |
| ניר עוז (il-31.3096-34.4008) | flat | none | 0 | 0 |
| נירים (il-31.3352-34.3950) | flat | none | 0 | 0 |
| כיסופים (il-31.3742-34.3995) | flat | none | 0 | 0 |
| רעים (il-31.3848-34.4586) | flat | none | 0 | 0 |
| אורים (il-31.3042-34.5220) | flat | none | 0 | 0 |
| עדי נגב - נחלת ערן (il-31.3155-34.5946) | flat | none | 0 | 0 |
| מסלול (il-31.3253-34.5886) | flat | none | 0 | 0 |
| פטיש (il-31.3274-34.5603) | flat | none | 0 | 0 |
| מלילות (il-31.3900-34.5959) | flat | none | 0 | 0 |
| גבעולים (il-31.3964-34.5915) | flat | none | 0 | 0 |
| שרשרת (il-31.4046-34.6041) | flat | none | 0 | 0 |
| אשל הנשיא (il-31.3253-34.6978) | flat | none | 0 | 0 |
| ברוש (il-31.3707-34.6351) | flat | none | 0 | 0 |
| תאשור (il-31.3719-34.6437) | flat | none | 0 | 0 |
| תראבין א-צאנע (il-31.3428-34.7356) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-עראקיב (il-31.3462-34.7797) | flat | none | 0 | 0 |
| גבעות בר (il-31.3556-34.7592) | flat | none | 0 | 0 |
| משמר הנגב (il-31.3641-34.7187) | flat | none | 0 | 0 |
| חורבת בקר (il-31.3628-34.7469) | flat | none | 0 | 0 |
| רהט (il-31.3934-34.7547) | flat | mosque-only | 0 | 0 |
| שובל (il-31.4143-34.7438) | flat | none | 0 | 0 |
| סנסנה (il-31.3629-34.9034) | flat | none | 0 | 0 |
| אל עביד (il-31.3669-34.8618) | flat | none | 0 | 0 |
| להב (il-31.3794-34.8701) | flat | none | 0 | 0 |
| אשכולות (il-31.3912-34.9047) | flat | none | 0 | 0 |
| רמאדין (il-31.3809-34.9116) | flat | mosque-only | minaret 1 | minaret 1 |
| כרמים (il-31.3356-34.9190) | flat | none | 0 | 0 |
| ח'רבת זנוטה (il-31.3713-34.9954) | flat | none | 0 | 0 |
| ענב אלכביר (il-31.3970-34.9278) | flat | none | 0 | 0 |
| ד'הרייה (il-31.4077-34.9711) | flat | mosque-only | minaret 2 | minaret 2 |
| עתיר (il-31.3245-35.0273) | flat | none | 0 | 0 |
| הר עמשא (il-31.3426-35.1022) | flat | none | 0 | 0 |
| שני (il-31.3563-35.0693) | flat | none | 0 | 0 |
| סמוע (il-31.3991-35.0670) | flat | mosque-only | minaret 2 | minaret 2 |
| ראפאת (il-31.3866-35.0631) | flat | mosque-only | 0 | 0 |
| שמעה (il-31.3876-35.0133) | flat | none | 0 | 0 |
| מצפה אשתמוע (il-31.3934-35.0162) | flat | none | 0 | 0 |
| אמנייזיל (il-31.3711-35.1046) | flat | none | 0 | 0 |
| ג'ינבה (il-31.3630-35.1397) | flat | mosque-only | minaret 1 | minaret 1 |
| מירקז (il-31.3630-35.1508) | flat | none | 0 | 0 |
| חאלאווה (il-31.3649-35.1575) | flat | none | 0 | 0 |
| ביר אעיד (il-31.3747-35.1308) | flat | none | 0 | 0 |
| חירבת אל פרחיית (il-31.3819-35.1740) | flat | none | 0 | 0 |
| חירבת אל מג'אז (il-31.3786-35.1888) | flat | none | 0 | 0 |
| איספיי אל פוקה (il-31.3982-35.1804) | flat | none | 0 | 0 |
| סוסיא הערבית (il-31.4011-35.1087) | flat | none | 0 | 0 |
| אביגיל (il-31.4028-35.1419) | flat | synagogue-only | 0 | 0 |
| כפר הנוקדים (il-31.3053-35.2693) | flat | none | 0 | 0 |
| דקייקה (il-31.3832-35.2249) | flat | none | 0 | 0 |
| בארי (il-31.4242-34.4911) | flat | none | 0 | 0 |
| נחל עוז (il-31.4724-34.4982) | flat | none | 0 | 0 |
| עזה (il-31.5129-34.4581) | flat | mosque+church | minaret 4 | minaret 4 |
| ג'באליה (il-31.5282-34.4832) | flat | mosque-only | minaret 3 | minaret 3 |
| בית הגדי (il-31.4239-34.6067) | flat | none | 0 | 0 |
| שוקדה (il-31.4217-34.5254) | flat | none | 0 | 0 |
| כפר מימון (il-31.4308-34.5364) | flat | none | 0 | 0 |
| זימרת (il-31.4473-34.5523) | flat | none | 0 | 0 |
| עלומים (il-31.4521-34.5137) | flat | none | 0 | 0 |
| כפר עזה (il-31.4833-34.5333) | flat | none | minaret 1 | minaret 1 |
| יכיני (il-31.4832-34.6001) | flat | none | minaret 1 | minaret 1 |
| מפלסים (il-31.5027-34.5621) | flat | none | minaret 2 | minaret 2 |
| פעמי תש"ז (il-31.4382-34.6930) | flat | none | 0 | 0 |
| תלמי ביל״ו (il-31.4377-34.6455) | flat | none | 0 | 0 |
| יושיביה (il-31.4435-34.6091) | flat | none | minaret 1 | minaret 1 |
| אשבול (il-31.4475-34.6664) | flat | none | 0 | 0 |
| מבועים (il-31.4493-34.6547) | flat | none | 0 | 0 |
| קלחים (il-31.4506-34.6781) | flat | none | 0 | 0 |
| זרועה (il-31.4594-34.6235) | flat | none | minaret 1 | minaret 1 |
| ניר עקיבא (il-31.4695-34.6455) | flat | none | 0 | 0 |
| ניר משה (il-31.4773-34.6300) | flat | none | minaret 1 | minaret 1 |
| זיאדנה (il-31.4135-34.7745) | flat | mosque-only | 0 | 0 |
| הוזייל (il-31.4149-34.7610) | flat | none | 0 | 0 |
| בית קמה (il-31.4475-34.7623) | flat | none | 0 | 0 |
| שדה צבי (il-31.4485-34.7133) | flat | none | 0 | 0 |
| רוחמה (il-31.4971-34.7067) | flat | none | 0 | 0 |
| דביר (il-31.4135-34.8233) | flat | none | 0 | 0 |
| אל-בורג' (il-31.4324-34.9242) | flat | mosque-only | minaret 1 | minaret 1 |
| אל בירה (il-31.4391-34.9258) | flat | mosque-only | minaret 1 | minaret 1 |
| ח'רסא (il-31.4408-34.9983) | flat | none | 0 | 0 |
| בית א-רוש אל-פקווה (il-31.4526-34.9263) | flat | mosque-only | minaret 1 | minaret 1 |
| בית א-רוש אל-תחתא (il-31.4626-34.9353) | flat | mosque-only | minaret 1 | minaret 1 |
| דיר אל-עסל אל-פוקא (il-31.4680-34.9384) | flat | mosque-only | minaret 1 | minaret 1 |
| דיר אל-עסל אל תחתא (il-31.4732-34.9451) | flat | none | minaret 1 | minaret 1 |
| אסקייק (il-31.4651-34.9561) | flat | none | 0 | 0 |
| א-סורה (il-31.4715-35.0022) | flat | mosque-only | minaret 2 | minaret 2 |
| אמריש (il-31.4708-35.0123) | flat | mosque-only | minaret 2 | minaret 2 |
| נטע (il-31.4779-34.9266) | flat | synagogue-only | 0 | 0 |
| מג'ד (il-31.4806-34.9511) | flat | none | minaret 1 | minaret 1 |
| סיכה (il-31.4921-34.9445) | flat | none | minaret 1 | minaret 1 |
| בית עווא (il-31.5061-34.9516) | flat | mosque-only | minaret 4 | minaret 4 |
| א־סימיא (il-31.4164-35.0412) | flat | none | 0 | 0 |
| יטא (il-31.4453-35.0900) | flat | mosque-only | minaret 1 | minaret 1 |
| כרמה (il-31.4515-35.0273) | flat | mosque-only | minaret 1 | minaret 1 |
| בית עמרה (il-31.4502-35.0482) | flat | mosque-only | minaret 2 | minaret 2 |
| א-ריחייא (il-31.4695-35.0776) | flat | mosque-only | minaret 1 | minaret 1 |
| האדאב אל פאוואר (il-31.4760-35.0534) | flat | mosque-only | minaret 2 | minaret 3 |
| אל פאוור (il-31.4806-35.0613) | flat | mosque-only | minaret 3 | minaret 3 |
| ח'רסא (il-31.4834-35.0178) | flat | none | minaret 1 | minaret 1 |
| Al Tabaqa (il-31.4904-35.0215) | flat | none | 0 | 0 |
| דורה (il-31.5066-35.0264) | flat | mosque-only | minaret 2 | minaret 2 |
| אל היג'רה (il-31.4904-35.0545) | flat | mosque-only | minaret 2 | minaret 2 |
| טראמה (il-31.4804-35.0318) | flat | none | minaret 1 | minaret 1 |
| בית חגי (il-31.4934-35.0804) | flat | none | 0 | 0 |
| חברון (il-31.5289-35.0945) | flat | mixed | minaret 2 | minaret 2 |
| الحاووز الثاني (il-31.5136-35.0781) | flat | mosque-only | minaret 2 | minaret 2 |
| الحاووز الاول (il-31.5246-35.0846) | flat | mosque-only | minaret 1 | minaret 1 |
| عيصى (il-31.5296-35.0804) | flat | mosque+church | minaret 3 | minaret 3 |
| الجًلَدة (il-31.5351-35.0829) | flat | mosque+church | minaret 1 | minaret 1 |
| תפוח (il-31.5382-35.0443) | flat | mosque-only | minaret 1 | minaret 1 |
| عين سارة (il-31.5385-35.0991) | flat | mosque+church | minaret 1 | minaret 1 |
| الحرس (il-31.5483-35.0974) | flat | mosque+church | minaret 3 | minaret 3 |
| University Neighborhood (il-31.5511-35.0928) | flat | mosque+church | minaret 3 | minaret 3 |
| Ras Al-Joura (il-31.5568-35.1005) | flat | mosque+church | minaret 3 | minaret 3 |
| חלחול (il-31.5775-35.0993) | flat | mosque-only | minaret 2 | minaret 2 |
| בית כאחיל (il-31.5709-35.0663) | flat | mosque-only | minaret 2 | minaret 2 |
| קלקאס (il-31.4932-35.0958) | flat | mosque-only | minaret 1 | minaret 1 |
| At-Tuba (il-31.4070-35.1757) | flat | none | 0 | 0 |
| חוות מעון (il-31.4093-35.1604) | flat | synagogue-only | 0 | 0 |
| מעון (il-31.4140-35.1629) | flat | none | 0 | 0 |
| ח'רבת מעין (il-31.4112-35.1318) | flat | mosque-only | 0 | 0 |
| א-תוואני (il-31.4133-35.1533) | flat | none | 0 | 0 |
| אל כרמיל (il-31.4230-35.1325) | flat | mosque-only | 0 | 0 |
| משק מן (il-31.4169-35.1770) | flat | none | 0 | 0 |
| אל פאקיר (il-31.4287-35.1939) | flat | mosque-only | minaret 1 | minaret 1 |
| أم الخير (il-31.4292-35.1854) | flat | mosque-only | minaret 1 | minaret 1 |
| אום אל חיר (il-31.4324-35.1856) | flat | none | 0 | 0 |
| أم لصفة (il-31.4360-35.1561) | flat | mosque-only | minaret 2 | minaret 2 |
| אום דאראג' א-זווידין (il-31.4444-35.1986) | flat | none | 0 | 0 |
| חוות מדבר חבר (il-31.4789-35.1650) | flat | none | 0 | 0 |
| מעלה חבר (il-31.4858-35.1651) | flat | none | 0 | 0 |
| النجادة (il-31.4076-35.2119) | flat | none | 0 | 0 |
| גבים (il-31.5067-34.5992) | flat | none | minaret 2 | minaret 2 |
| ניר עם (il-31.5193-34.5808) | flat | none | minaret 2 | minaret 2 |
| איבים (il-31.5333-34.6101) | flat | none | minaret 2, synagogue 1 | minaret 2, synagogue 1 |
| נתיב העשרה (il-31.5717-34.5395) | flat | none | 0 | 0 |
| אור הנר (il-31.5576-34.6001) | flat | none | minaret 1 | minaret 1 |
| ארז (il-31.5605-34.5666) | flat | none | minaret 2 | minaret 2 |
| יד מרדכי (il-31.5887-34.5590) | flat | none | 0 | 0 |
| דורות (il-31.5066-34.6460) | flat | none | minaret 1 | minaret 1 |
| ברור חיל (il-31.5581-34.6477) | flat | none | 0 | 0 |
| תלמים (il-31.5636-34.6721) | flat | none | 0 | 0 |
| חלץ (il-31.5774-34.6575) | flat | none | 0 | 0 |
| שדה דוד (il-31.5766-34.6846) | flat | none | 0 | 0 |
| גברעם (il-31.5909-34.6115) | flat | none | 0 | 0 |
| אחוזם (il-31.5522-34.7707) | flat | none | 0 | 0 |
| נועם (il-31.5669-34.7891) | flat | none | 0 | 0 |
| שלווה (il-31.5635-34.7680) | flat | none | 0 | 0 |
| אבן שמואל (il-31.5749-34.7643) | flat | synagogue-only | 0 | 0 |
| איתן (il-31.5728-34.7487) | flat | none | 0 | 0 |
| קריית גת (il-31.6094-34.7712) | flat | synagogue-only | 0 | 0 |
| עוזה (il-31.5925-34.7649) | flat | none | 0 | 0 |
| לכיש (il-31.5609-34.8411) | flat | none | 0 | 0 |
| שקף (il-31.5157-34.9378) | flat | none | 0 | 0 |
| דיר סאמת (il-31.5212-34.9729) | flat | mosque-only | minaret 2 | minaret 2 |
| אידנא (il-31.5580-34.9763) | flat | mosque-only | minaret 4 | minaret 4 |
| אמציה (il-31.5325-34.9143) | flat | none | 0 | 0 |
| כרמי קטיף (il-31.5372-34.9127) | flat | synagogue-only | 0 | 0 |
| תרקומייה (il-31.5753-35.0089) | flat | mosque-only | minaret 2 | minaret 2 |
| בית אולא (il-31.5968-35.0285) | flat | mosque-only | minaret 2 | minaret 2 |
| בקר (il-31.6069-35.0776) | flat | mosque-only | 0 | 0 |
| ח'אראס (il-31.6140-35.0418) | flat | mosque-only | 0 | 0 |
| נובא (il-31.6066-35.0365) | flat | mosque-only | minaret 3 | minaret 3 |
| חתא (il-31.6202-35.0213) | flat | mosque-only | minaret 1 | minaret 1 |
| בני נעים (il-31.5169-35.1630) | flat | mosque-only | minaret 1 | minaret 1 |
| אל עודיסה (il-31.5269-35.1433) | flat | none | minaret 1 | minaret 1 |
| Al-Uddeisa (il-31.5428-35.1427) | flat | none | 0 | 0 |
| الدوّارة (il-31.5573-35.1432) | flat | none | 0 | 0 |
| אלשיוח' (il-31.5769-35.1507) | flat | mosque-only | minaret 1 | minaret 1 |
| סעיר (il-31.5829-35.1452) | flat | mosque-only | minaret 2 | minaret 2 |
| מיצד (il-31.5859-35.1878) | flat | none | 0 | 0 |
| פני קדם (il-31.5893-35.1957) | flat | synagogue-only | 0 | 0 |
| ערב א-רשיידה (il-31.5703-35.2307) | flat | mosque-only | minaret 2 | minaret 2 |
| חאן ערוגות (il-31.5987-35.2167) | flat | none | minaret 1 | minaret 1 |
| מצפה שלם (il-31.5697-35.4007) | flat | none | 0 | 0 |
| מצוקי דרגות (il-31.5909-35.3933) | flat | none | 0 | 0 |
| כרמיה (il-31.6054-34.5430) | flat | none | 0 | 0 |
| זיקים (il-31.6094-34.5222) | flat | none | 0 | 0 |
| מבקיעים (il-31.6222-34.5771) | flat | none | 0 | 0 |
| בית שיקמה (il-31.6375-34.6105) | flat | none | 0 | 0 |
| בת הדר (il-31.6465-34.5960) | flat | none | 0 | 0 |
| אשקלון (il-31.6654-34.5650) | flat | mixed | 0 | 0 |
| באר גנים (il-31.7001-34.6106) | flat | synagogue-only | 0 | 0 |
| תלמי יפה (il-31.6169-34.6133) | flat | none | 0 | 0 |
| כוכב מיכאל (il-31.6275-34.6671) | flat | none | 0 | 0 |
| נוגה (il-31.6252-34.6953) | flat | none | 0 | 0 |
| נהורה (il-31.6227-34.7047) | flat | none | 0 | 0 |
| עוצם (il-31.6366-34.7026) | flat | none | 0 | 0 |
| שדה יואב (il-31.6457-34.6770) | flat | none | 0 | 0 |
| משען (il-31.6576-34.6238) | flat | none | 0 | 0 |
| ברכיה (il-31.6678-34.6268) | flat | none | 0 | 0 |
| הודיה (il-31.6757-34.6398) | flat | none | 0 | 0 |
| ניר ישראל (il-31.6873-34.6364) | flat | none | 0 | 0 |
| ניר ח״ן (il-31.6084-34.7145) | flat | none | 0 | 0 |
| שדה משה (il-31.6102-34.8027) | flat | none | 0 | 0 |
| שחר (il-31.6184-34.7241) | flat | none | 0 | 0 |
| גת (il-31.6269-34.7951) | flat | none | 0 | 0 |
| יד נתן (il-31.6529-34.7055) | flat | none | 0 | 0 |
| רווחה (il-31.6495-34.7317) | flat | none | 0 | 0 |
| אלומה (il-31.6520-34.7427) | flat | none | 0 | 0 |
| מנוחה (il-31.6565-34.7767) | flat | none | 0 | 0 |
| ורדון (il-31.6635-34.7822) | flat | none | 0 | 0 |
| סגולה (il-31.6697-34.7792) | flat | none | 0 | 0 |
| זבדיאל (il-31.6584-34.7597) | flat | none | 0 | 0 |
| נחלה (il-31.6580-34.7950) | flat | none | 0 | 0 |
| קוממיות (il-31.6620-34.7298) | flat | none | 0 | 0 |
| ניר בנים (il-31.6717-34.7542) | flat | none | 0 | 0 |
| זרחיה (il-31.6807-34.7455) | flat | none | 0 | 0 |
| עין צורים (il-31.6941-34.7201) | flat | synagogue-only | 0 | 0 |
| שפיר (il-31.6971-34.7284) | flat | synagogue-only | 0 | 0 |
| קדמה (il-31.7007-34.7751) | flat | none | 0 | 0 |
| בית גוברין (il-31.6123-34.8964) | flat | none | 0 | 0 |
| גלאון (il-31.6341-34.8490) | flat | none | 0 | 0 |
| בית ניר (il-31.6473-34.8741) | flat | none | 0 | 0 |
| לוזית (il-31.6878-34.8877) | flat | none | 0 | 0 |
| כפר זוהרים (il-31.6217-34.9249) | flat | none | 0 | 0 |
| נחושה (il-31.6288-34.9523) | flat | none | 0 | 0 |
| אדרת (il-31.6597-34.9957) | flat | none | synagogue 1 | synagogue 1 |
| צפרירים (il-31.6600-34.9444) | flat | none | 0 | 0 |
| גבעת ישעיהו (il-31.6702-34.9463) | flat | none | 0 | 0 |
| שריגים (לי־און) (il-31.6770-34.9358) | flat | none | 0 | 0 |
| נתיב הל"ה (il-31.6886-34.9823) | flat | none | 0 | 0 |
| עגור (il-31.6971-34.9129) | flat | none | 0 | 0 |
| בית שמש (il-31.7462-34.9887) | flat | synagogue-only | 0 | 0 |
| זנוח (il-31.7316-35.0007) | flat | none | 0 | 0 |
| מחסיה (il-31.7482-35.0074) | flat | none | 0 | 0 |
| נחם (il-31.7666-35.0040) | flat | none | 0 | 0 |
| צרעה (il-31.7627-34.9686) | flat | none | 0 | 0 |
| בית אומר (il-31.6210-35.1031) | flat | mosque-only | minaret 2 | minaret 2 |
| חירבת אל מנטרה (il-31.6333-35.0976) | flat | mosque-only | 0 | 0 |
| ג'אלא (il-31.6219-35.0716) | flat | none | synagogue 1 | synagogue 1 |
| סוריף (il-31.6504-35.0641) | flat | mosque-only | minaret 4 | minaret 4 |
| الظهر (il-31.6466-35.0646) | flat | mosque-only | minaret 3 | minaret 3 |
| السرج (il-31.6462-35.0740) | flat | mosque-only | synagogue 1 | synagogue 1 |
| القرنة (il-31.6516-35.0703) | flat | none | synagogue 1 | synagogue 1 |
| الضاحية الشمالية (il-31.6543-35.0739) | flat | none | synagogue 1 | synagogue 1 |
| القرينات وضاحية القندول (il-31.6531-35.0825) | flat | none | 0 | 0 |
| Al-Baka'a (il-31.6553-35.0614) | flat | none | synagogue 1 | synagogue 1 |
| الثغرة (il-31.6575-35.0687) | flat | none | synagogue 1 | synagogue 1 |
| الضاحية الجنوبية (il-31.6381-35.0576) | flat | none | synagogue 1 | synagogue 1 |
| علي غنيم (il-31.6589-35.0787) | flat | none | synagogue 1 | synagogue 1 |
| قرية دير موسى (il-31.6642-35.0663) | flat | none | synagogue 1 | synagogue 1 |
| אל-ג'בעה (il-31.6748-35.0784) | flat | none | minaret 1 | minaret 1 |
| ضاحية الزيتون - الصوانة (il-31.6429-35.0478) | flat | none | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| צוריף (il-31.6533-35.0469) | flat | none | synagogue 1 | synagogue 1 |
| סאפה (il-31.6433-35.0993) | flat | none | 0 | 0 |
| ח'ירבת א-דאר (il-31.6556-35.0260) | flat | none | synagogue 1 | synagogue 1 |
| גבעות עדן (il-31.6606-35.0157) | flat | none | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| ואדי פוקין (il-31.7074-35.1035) | flat | mixed | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| מבוא ביתר (il-31.7227-35.1071) | flat | none | 0 | 0 |
| נחאלין (il-31.6853-35.1193) | flat | mosque-only | minaret 2 | minaret 2 |
| חוסאן (il-31.7080-35.1356) | flat | mosque-only | minaret 4 | minaret 4 |
| בתיר (il-31.7254-35.1354) | flat | mosque-only | minaret 3 | minaret 3 |
| אל-ח'דר (il-31.6947-35.1668) | flat | mixed | minaret 2 | minaret 2 |
| בר כוכבא (il-31.7135-35.1532) | flat | mosque-only | minaret 2 | minaret 2 |
| א-דוחה (il-31.7009-35.1800) | flat | mosque-only | minaret 2 | minaret 2 |
| בית ג'אלה (il-31.7155-35.1874) | flat | mosque+church | minaret 3 | minaret 3 |
| הר גילה (il-31.7218-35.1715) | flat | none | minaret 1 | minaret 1 |
| ארטאס (il-31.6906-35.1875) | flat | mosque-only | minaret 2 | minaret 2 |
| אל-וולג'ה (il-31.7307-35.1614) | flat | mixed | church 1, minaret 3 | church 1, minaret 3 |
| ביר עונה (il-31.7204-35.1901) | flat | none | 0 | 0 |
| ח'לת חמאמה (il-31.7205-35.1948) | flat | mosque-only | minaret 1 | minaret 1 |
| חוות העיטם (il-31.6751-35.1904) | flat | none | 0 | 0 |
| רמת רחל (il-31.7387-35.2183) | flat | none | church 1 | church 1 |
| אל-ביידא (il-31.6705-35.1810) | flat | mixed | minaret 1 | minaret 1 |
| בית סאחור (il-31.7021-35.2297) | flat | mosque-only | church 2, minaret 1 | church 2, minaret 1 |
| אל-תרבה (il-31.6638-35.1789) | flat | mosque-only | minaret 1 | minaret 1 |
| ואדי רחאל (il-31.6673-35.1704) | flat | mixed | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| מוצא (il-31.7928-35.1685) | flat | synagogue-only | 0 | 0 |
| אפרת (il-31.6536-35.1509) | flat | synagogue-only | 0 | 0 |
| אורה (il-31.7527-35.1535) | flat | none | 0 | 0 |
| ואדי א-ניס (il-31.6541-35.1613) | flat | mosque-only | minaret 1 | minaret 1 |
| בית זית (il-31.7826-35.1593) | flat | synagogue-only | 0 | 0 |
| ג'ורת א-שמעה (il-31.6514-35.1697) | flat | mosque-only | 0 | 0 |
| מוצא עילית (il-31.7935-35.1566) | flat | synagogue-only | 0 | 0 |
| מבשרת ציון (il-31.8057-35.1527) | flat | synagogue-only | 0 | 0 |
| מראח מעלה (il-31.6495-35.1768) | flat | mosque-only | 0 | 0 |
| עמינדב (il-31.7511-35.1420) | flat | synagogue-only | 0 | 0 |
| אל-נועמן (il-31.7148-35.2495) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-ח'אס (il-31.7147-35.2547) | flat | mosque-only | minaret 3 | minaret 3 |
| בית ספר חקלאי עין כרם (il-31.7788-35.1532) | flat | none | 0 | 0 |
| א-שייח' סעד (il-31.7373-35.2568) | flat | mosque-only | minaret 2 | minaret 2 |
| ענאתא (il-31.8083-35.2573) | flat | mosque-only | church 1, westernWall 1 | church 1, westernWall 1 |
| אבו דיס (il-31.7642-35.2585) | flat | mosque-only | 0 | 0 |
| אל-שוואוורה (il-31.6919-35.2663) | flat | mosque-only | minaret 5, synagogue 1 | minaret 5, synagogue 1 |
| אל-עיזריה (il-31.7732-35.2596) | flat | mosque-only | minaret 2, westernWall 1 | minaret 2, westernWall 1 |
| מעוז ציון (il-31.7938-35.1434) | flat | synagogue-only | 0 | 0 |
| חיזמא (il-31.8339-35.2636) | flat | mixed | minaret 2, synagogue 1 | minaret 2, synagogue 1 |
| דאר סלאח (il-31.7086-35.2648) | flat | mosque-only | minaret 3, synagogue 1 | minaret 3, synagogue 1 |
| א-ראם (il-31.8512-35.2358) | flat | mixed | minaret 3 | minaret 3 |
| א-זעיים (il-31.7873-35.2663) | flat | mosque-only | westernWall 1 | westernWall 1 |
| א-סואחרה א-שרקיה (il-31.7433-35.2697) | flat | mosque-only | minaret 3 | minaret 3 |
| אל-עובידיה (il-31.7186-35.2765) | flat | mosque-only | minaret 3 | minaret 3 |
| ג'בע (il-31.8573-35.2538) | flat | mosque-only | minaret 5 | minaret 5 |
| מ.פ. קלנדיה (il-31.8705-35.2270) | flat | mosque-only | minaret 2 | minaret 2 |
| ام عسلة (il-31.6977-35.2820) | flat | mosque-only | minaret 2 | minaret 2 |
| ביר נבאלא (il-31.8510-35.1988) | flat | mosque-only | minaret 1, westernWall 1 | minaret 1, westernWall 1 |
| קלנדיה (il-31.8634-35.2071) | flat | mosque-only | minaret 1 | minaret 1 |
| ערב אל ג'האלין (il-31.7658-35.2833) | flat | mosque-only | westernWall 1 | westernWall 1 |
| בית חנינא אל-בלד (il-31.8310-35.2057) | flat | mosque-only | minaret 2 | minaret 2 |
| אל בירה (il-31.9007-35.2118) | flat | mosque-only | minaret 4 | minaret 4 |
| אל-ג'דירה (il-31.8579-35.1968) | flat | mosque-only | minaret 1 | minaret 1 |
| פסגות (il-31.8986-35.2241) | flat | mixed | church 1, minaret 2, synagogue 2 | church 1, minaret 2, synagogue 2 |
| גבע בנימין (אדם) (il-31.8503-35.2740) | flat | mixed | minaret 2, westernWall 1 | minaret 2, westernWall 1 |
| רמאללה (il-31.9031-35.1952) | flat | mosque+church | minaret 3 | minaret 3 |
| ראפאת (il-31.8718-35.1928) | flat | mosque-only | 0 | 0 |
| אל-ג'יב (il-31.8510-35.1823) | flat | mosque-only | minaret 1 | minaret 1 |
| ביתוניא (il-31.8860-35.1704) | flat | mixed | minaret 2 | minaret 2 |
| الطيرة (il-31.9200-35.1786) | flat | mosque+church | minaret 2 | minaret 2 |
| סורדא (il-31.9374-35.2007) | flat | mosque-only | minaret 4 | minaret 4 |
| שכונת אל-ח'לאיילה (il-31.8498-35.1652) | flat | none | 0 | 0 |
| מ.פ. ג'לזון (il-31.9515-35.2116) | flat | mosque-only | minaret 2 | minaret 2 |
| גבעון החדשה (il-31.8482-35.1576) | flat | none | 0 | 0 |
| בית אג'זא (il-31.8480-35.1516) | flat | mosque-only | 0 | 0 |
| בידו (il-31.8350-35.1469) | flat | mosque-only | minaret 2 | minaret 2 |
| בית סוריכ (il-31.8230-35.1496) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-קובייבה (il-31.8403-35.1371) | flat | mosque+church | minaret 1 | minaret 1 |
| קטנה (il-31.8370-35.1252) | flat | mosque-only | minaret 2 | minaret 2 |
| אל ערוב (il-31.6232-35.1369) | flat | mosque-only | minaret 4 | minaret 4 |
| בית פג'אר (il-31.6232-35.1539) | flat | mosque-only | minaret 2 | minaret 2 |
| בית הברכה (il-31.6319-35.1316) | flat | none | minaret 2 | minaret 2 |
| מראח רבאח (il-31.6353-35.1859) | flat | none | 0 | 0 |
| שדה בועז (il-31.6937-35.1479) | flat | none | 0 | 0 |
| איבי הנחל (il-31.6056-35.2191) | flat | mosque-only | 0 | 0 |
| נוקדים (il-31.6450-35.2441) | flat | none | minaret 1 | minaret 1 |
| כפר אלדד (il-31.6541-35.2509) | flat | none | minaret 1 | minaret 1 |
| מעלה רחבעם (il-31.6478-35.2585) | flat | none | 0 | 0 |
| תקוע (il-31.6533-35.2293) | flat | mixed | synagogue 2 | synagogue 2 |
| חוות שדה בר (il-31.6597-35.2440) | flat | none | minaret 1 | minaret 1 |
| ג'ובת א-דיב (il-31.6634-35.2480) | flat | mosque-only | 0 | 0 |
| אבנת (il-31.6793-35.4365) | flat | none | 0 | 0 |
| ניצנים (il-31.7168-34.6342) | flat | none | 0 | 0 |
| גבעתי (il-31.7340-34.6793) | flat | none | 0 | 0 |
| עזר (il-31.7365-34.6715) | flat | none | 0 | 0 |
| אמונים (il-31.7453-34.6770) | flat | none | 0 | 0 |
| שדה עוזיהו (il-31.7576-34.6785) | flat | synagogue-only | 0 | 0 |
| בית עזרא (il-31.7366-34.6564) | flat | none | 0 | 0 |
| ניצן ב׳ (il-31.7361-34.6360) | flat | none | 0 | 0 |
| ניצן (il-31.7399-34.6318) | flat | synagogue-only | 0 | 0 |
| עזריקם (il-31.7538-34.6949) | flat | none | 0 | 0 |
| אשדוד (il-31.7977-34.6530) | flat | synagogue-only | 0 | 0 |
| שתולים (il-31.7720-34.6836) | flat | none | 0 | 0 |
| אביגדור (il-31.7110-34.7436) | flat | none | 0 | 0 |
| קרית מלאכי (il-31.7316-34.7446) | flat | synagogue-only | 0 | 0 |
| תימורים (il-31.7161-34.7613) | flat | none | 0 | 0 |
| אורות (il-31.7407-34.7349) | flat | none | 0 | 0 |
| כפר ורבורג (il-31.7200-34.7242) | flat | none | 0 | 0 |
| כפר אחים (il-31.7448-34.7564) | flat | none | 0 | 0 |
| באר טוביה (il-31.7339-34.7263) | flat | none | 0 | 0 |
| ינון (il-31.7429-34.7795) | flat | none | 0 | 0 |
| כפר הרי״ף (il-31.7463-34.7925) | flat | none | 0 | 0 |
| תלמי יחיאל (il-31.7537-34.7640) | flat | none | 0 | 0 |
| בני ראם (il-31.7698-34.7906) | flat | none | 0 | 0 |
| חצור אשדוד (il-31.7731-34.7210) | flat | none | 0 | 0 |
| חצב (il-31.7793-34.7694) | flat | none | 0 | 0 |
| בני עי"ש (il-31.7892-34.7606) | flat | none | 0 | 0 |
| חפץ חיים (il-31.7888-34.8000) | flat | none | 0 | 0 |
| ביצרון (il-31.7950-34.7393) | flat | none | 0 | 0 |
| קדרון (il-31.8151-34.7977) | flat | none | 0 | 0 |
| אל עזי (il-31.7189-34.8143) | flat | none | 0 | 0 |
| כפר מנחם (il-31.7310-34.8352) | flat | none | 0 | 0 |
| גפן (il-31.7405-34.8792) | flat | none | 0 | 0 |
| תירוש (il-31.7508-34.8861) | flat | none | 0 | 0 |
| רבדים (il-31.7731-34.8153) | flat | none | 0 | 0 |
| יד בנימין (il-31.7978-34.8216) | flat | synagogue-only | 0 | 0 |
| זכריה (il-31.7098-34.9441) | flat | none | 0 | 0 |
| שדות מיכה (il-31.7215-34.9206) | flat | none | 0 | 0 |
| בית ג'מל (il-31.7248-34.9761) | flat | synagogue-only | 0 | 0 |
| ישעי (il-31.7516-34.9654) | flat | none | 0 | 0 |
| תרום (il-31.7826-34.9815) | flat | none | 0 | 0 |
| כפר אוריה (il-31.7920-34.9466) | flat | none | 0 | 0 |
| תעוז (il-31.8020-34.9745) | flat | none | 0 | 0 |
| טל שחר (il-31.8051-34.9022) | flat | none | 0 | 0 |
| בר גיורא (il-31.7298-35.0727) | flat | none | 0 | 0 |
| נס הרים (il-31.7445-35.0580) | flat | none | 0 | 0 |
| כסלון (il-31.7741-35.0492) | flat | none | 0 | 0 |
| רמת רזיאל (il-31.7737-35.0738) | flat | none | 0 | 0 |
| אשתאול (il-31.7802-35.0098) | flat | none | 0 | 0 |
| איתנים (il-31.7790-35.0950) | flat | none | 0 | 0 |
| גבעת יערים (il-31.7860-35.0926) | flat | none | 0 | 0 |
| בית מאיר (il-31.7939-35.0361) | flat | none | 0 | 0 |
| שורש (il-31.7975-35.0651) | flat | none | 0 | 0 |
| שואבה (il-31.7992-35.0791) | flat | none | 0 | 0 |
| מסילת ציון (il-31.8018-35.0115) | flat | none | 0 | 0 |
| חוות נווה אורי הישנה (il-31.7120-35.1647) | flat | none | synagogue 1 | synagogue 1 |
| אבן ספיר (il-31.7630-35.1351) | flat | none | 0 | 0 |
| צובה (il-31.7827-35.1207) | flat | none | 0 | 0 |
| עין ראפה (il-31.7902-35.1163) | flat | mosque-only | 0 | 0 |
| עין נקובא (il-31.7936-35.1191) | flat | none | 0 | 0 |
| אבו גוש (il-31.8063-35.1089) | flat | mosque+church | minaret 2 | minaret 2 |
| בית נקופה (il-31.8029-35.1253) | flat | none | 0 | 0 |
| קריית ענבים (il-31.8100-35.1203) | flat | none | 0 | 0 |
| מעלה החמישה (il-31.8175-35.1116) | flat | mosque-only | 0 | 0 |
| יד השמונה (il-31.8095-35.0902) | flat | none | 0 | 0 |
| נוה אילן (il-31.8092-35.0789) | flat | none | minaret 1 | minaret 1 |
| חוות צאן קידר (il-31.7366-35.3195) | flat | none | minaret 1 | minaret 1 |
| קידר (il-31.7546-35.3105) | flat | none | minaret 1 | minaret 1 |
| ח'אן אל-אחמר (il-31.8109-35.3344) | flat | none | minaret 1 | minaret 1 |
| ביר אל-מקסוב (il-31.8025-35.3113) | flat | synagogue-only | 0 | 0 |
| כסאראת (il-31.8056-35.3102) | flat | synagogue-only | 0 | 0 |
| אל-ר'ואליה (il-31.8133-35.3046) | flat | none | minaret 1 | minaret 1 |
| אלמוג (il-31.7900-35.4616) | flat | none | synagogue 1 | synagogue 1 |
| נווה מבטח (il-31.8059-34.7410) | flat | none | 0 | 0 |
| מישר (il-31.8175-34.7531) | flat | synagogue-only | 0 | 0 |
| שדמה (il-31.8331-34.7404) | flat | none | 0 | 0 |
| כפר מרדכי (il-31.8311-34.7562) | flat | synagogue-only | 0 | 0 |
| כפר אביב (il-31.8318-34.7213) | flat | none | 0 | 0 |
| בית אלעזרי (il-31.8461-34.8030) | flat | synagogue-only | 0 | 0 |
| גבעת ברנר (il-31.8675-34.8005) | flat | none | 0 | 0 |
| גן שלמה (קבוצת שילר) (il-31.8777-34.7983) | flat | none | 0 | 0 |
| חבצלת (il-31.8755-34.8154) | flat | synagogue-only | 0 | 0 |
| כפר ביל"ו (il-31.8775-34.8203) | flat | none | 0 | 0 |
| כפר ביל״ו ב׳ (il-31.8714-34.8279) | flat | synagogue-only | 0 | 0 |
| מילצ'ן (il-31.8822-34.8128) | flat | synagogue-only | 0 | 0 |
| עין גנים (il-31.8819-34.8156) | flat | synagogue-only | 0 | 0 |
| גיבתון (il-31.8888-34.7995) | flat | none | 0 | 0 |
| היובל (il-31.8877-34.8261) | flat | synagogue-only | 0 | 0 |
| קרית ההגנה (il-31.8862-34.8302) | flat | synagogue-only | 0 | 0 |
| גני יוחנן (il-31.8603-34.8407) | flat | none | 0 | 0 |
| טירת שלום (il-31.9093-34.7854) | flat | synagogue-only | 0 | 0 |
| נצר סרני (il-31.9231-34.8240) | flat | none | minaret 1 | minaret 1 |
| גאליה (il-31.8847-34.7648) | flat | synagogue-only | 0 | 0 |
| באר יעקב (il-31.9444-34.8399) | flat | synagogue-only | 0 | 0 |
| אירוס (il-31.9285-34.7759) | flat | synagogue-only | 0 | 0 |
| בית עובד (il-31.9213-34.7738) | flat | synagogue-only | 0 | 0 |
| בית חנן (il-31.9338-34.7740) | flat | synagogue-only | 0 | 0 |
| עיינות (il-31.9159-34.7678) | flat | none | 0 | 0 |
| נטעים (il-31.9444-34.7744) | flat | none | 0 | 0 |
| רמלה (il-31.9280-34.8623) | flat | mixed | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| ניר צבי (il-31.9514-34.8610) | flat | synagogue-only | 0 | 0 |
| ישרש (il-31.9158-34.8499) | flat | mosque-only | minaret 1 | minaret 1 |
| אבו ליבדה (il-31.9720-34.8457) | flat | none | 0 | 0 |
| גן שורק (il-31.9447-34.7599) | flat | none | 0 | 0 |
| דהמש (il-31.9437-34.8671) | flat | none | 0 | 0 |
| בית דגן (il-32.0019-34.8302) | flat | synagogue-only | 0 | 0 |
| לוד (il-31.9489-34.8885) | flat | mixed | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| בת ים (il-32.0155-34.7505) | flat | synagogue-only | 0 | 0 |
| חולון (il-32.0193-34.7804) | flat | synagogue-only | 0 | 0 |
| אחיעזר (il-31.9811-34.8717) | flat | none | minaret 1 | minaret 1 |
| אזור (il-32.0282-34.8026) | flat | synagogue-only | 0 | 0 |
| תל אביב–יפו (il-32.0853-34.7818) | flat | mixed | minaret 1 | minaret 1 |
| יגל (il-31.9870-34.8806) | flat | none | minaret 1 | minaret 1 |
| כפר חב"ד (il-31.9886-34.8474) | flat | synagogue-only | 0 | 0 |
| גבעתיים (il-32.0730-34.8113) | flat | synagogue-only | 0 | 0 |
| משמר השבעה (il-32.0092-34.8234) | flat | none | minaret 1 | minaret 1 |
| גנות (il-32.0190-34.8267) | flat | synagogue-only | 0 | 0 |
| רמת השרון (il-32.1431-34.8381) | flat | synagogue-only | 0 | 0 |
| חמ"ד (il-32.0191-34.8412) | flat | synagogue-only | 0 | 0 |
| גליל ים (il-32.1569-34.8300) | flat | synagogue-only | 0 | 0 |
| גבעת שמואל (il-32.0769-34.8525) | flat | synagogue-only | 0 | 0 |
| הרצליה (il-32.1656-34.8469) | flat | mixed | 0 | 0 |
| פתח תקווה (il-32.0878-34.8860) | flat | synagogue-only | 0 | 0 |
| כפר שמריהו (il-32.1854-34.8198) | flat | none | 0 | 0 |
| סביון (il-32.0475-34.8799) | flat | synagogue-only | 0 | 0 |
| גני תקווה (il-32.0604-34.8761) | flat | synagogue-only | 0 | 0 |
| רשפון (il-32.1996-34.8244) | flat | mosque-only | 0 | 0 |
| גבעת ח"ן (il-32.1686-34.8761) | flat | none | minaret 1 | minaret 1 |
| גני יהודה (il-32.0403-34.8773) | flat | synagogue-only | 0 | 0 |
| ארסוף קדם (il-32.2060-34.8207) | flat | none | 0 | 0 |
| יהוד מונוסון (il-32.0332-34.8907) | flat | mixed | minaret 1 | minaret 1 |
| גת רימון (il-32.0674-34.8805) | flat | synagogue-only | 0 | 0 |
| כפר מעש (il-32.0652-34.8875) | flat | none | 0 | 0 |
| כפר סבא (il-32.1773-34.9075) | flat | mixed | minaret 1 | minaret 1 |
| ירקונה (il-32.1460-34.8988) | flat | synagogue-only | 0 | 0 |
| עדנים (il-32.1383-34.9083) | flat | synagogue-only | 0 | 0 |
| גן חיים (il-32.1951-34.9055) | flat | none | minaret 1 | minaret 1 |
| נחלים (il-32.0590-34.9136) | flat | synagogue-only | 0 | 0 |
| כפר סירקין (il-32.0777-34.9235) | flat | synagogue-only | 0 | 0 |
| שדה ורבורג (il-32.2094-34.9048) | flat | none | 0 | 0 |
| נוה ימין (il-32.1719-34.9388) | flat | mixed | minaret 2 | minaret 2 |
| בניה (il-31.8435-34.7536) | flat | synagogue-only | 0 | 0 |
| בן זכאי (il-31.8569-34.7296) | flat | synagogue-only | 0 | 0 |
| יבנה (il-31.8769-34.7383) | flat | synagogue-only | 0 | 0 |
| כפר הנגיד (il-31.8867-34.7496) | flat | none | 0 | 0 |
| משמר דוד (il-31.8225-34.9009) | flat | none | 0 | 0 |
| חולדה (il-31.8311-34.8828) | flat | none | synagogue 2 | synagogue 2 |
| פתחיה (il-31.8676-34.8863) | flat | none | synagogue 2 | synagogue 2 |
| יציץ (il-31.8623-34.8629) | flat | none | 0 | 0 |
| רמות מאיר (il-31.8746-34.8558) | flat | synagogue-only | 0 | 0 |
| גני הדר (il-31.8793-34.8530) | flat | none | minaret 1 | minaret 1 |
| נען (il-31.8838-34.8571) | flat | none | minaret 1 | minaret 1 |
| סתריה (il-31.8919-34.8441) | flat | none | 0 | 0 |
| בית עוזיאל (il-31.8694-34.9052) | flat | none | synagogue 1 | synagogue 1 |
| כפר שמואל (il-31.8891-34.9328) | flat | none | synagogue 1 | synagogue 1 |
| צלפון (il-31.8041-34.9327) | flat | none | 0 | 0 |
| גיזו (il-31.8041-34.9381) | flat | none | 0 | 0 |
| הראל (il-31.8094-34.9491) | flat | none | 0 | 0 |
| נוה שלום (il-31.8175-34.9782) | flat | none | 0 | 0 |
| בקוע (il-31.8294-34.9270) | flat | none | 0 | 0 |
| נחשון (il-31.8310-34.9559) | flat | none | synagogue 1 | synagogue 1 |
| כרמי יוסף (il-31.8470-34.9205) | flat | none | synagogue 1 | synagogue 1 |
| שילת (il-31.9206-35.0173) | flat | none | minaret 1 | minaret 1 |
| חוות שער הגיא הנטושה (il-31.8036-35.0451) | flat | mosque-only | minaret 1 | minaret 1 |
| נטף (il-31.8320-35.0680) | flat | none | 0 | 0 |
| חראייב אום אל-לחם (il-31.8382-35.0955) | flat | mosque-only | minaret 1 | minaret 1 |
| מבוא חורון (il-31.8502-35.0355) | flat | synagogue-only | 0 | 0 |
| בית ליקיא (il-31.8694-35.0662) | flat | mosque-only | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| בית סירא (il-31.8878-35.0444) | flat | mixed | minaret 1 | minaret 1 |
| ח'ירבת אל מיסבאח (il-31.8851-35.0725) | flat | mosque-only | minaret 3 | minaret 3 |
| בית עור א-תחתא (il-31.8958-35.0850) | flat | mosque-only | minaret 2 | minaret 2 |
| ספא (il-31.9066-35.0594) | flat | mosque-only | minaret 2 | minaret 2 |
| בית איכסא (il-31.8179-35.1799) | flat | mosque-only | minaret 1 | minaret 1 |
| נבי סמואל - כפר (il-31.8338-35.1840) | flat | none | minaret 1 | minaret 1 |
| א-נבי סימואיל בדואים (il-31.8359-35.1868) | flat | none | minaret 1, westernWall 1 | minaret 1, westernWall 1 |
| בית ענאן (il-31.8511-35.1121) | flat | mosque-only | minaret 2 | minaret 2 |
| בית דוקו (il-31.8582-35.1325) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-טירה (il-31.8693-35.1234) | flat | mosque-only | minaret 1 | minaret 1 |
| בית עור אל-פוקא (il-31.8860-35.1148) | flat | mosque-only | minaret 2 | minaret 2 |
| אל-פקרא (il-31.8117-35.2993) | flat | none | minaret 1 | minaret 1 |
| עלמון (il-31.8316-35.2965) | flat | none | synagogue 1 | synagogue 1 |
| מחמאס (il-31.8722-35.2775) | flat | mosque-only | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| מגרון (il-31.8742-35.2591) | flat | none | 0 | 0 |
| בורקא (il-31.8953-35.2533) | flat | mosque-only | minaret 2 | minaret 2 |
| חוות חנינה (il-31.8945-35.3048) | flat | none | minaret 1 | minaret 1 |
| נופי פרת (il-31.8238-35.3208) | flat | none | synagogue 1 | synagogue 1 |
| אלון (il-31.8329-35.3534) | flat | none | 0 | 0 |
| בני אדם (il-31.8449-35.3064) | flat | none | 0 | 0 |
| מצפה חגית (il-31.8512-35.3381) | flat | none | 0 | 0 |
| נווה ארז (il-31.8655-35.3109) | flat | none | 0 | 0 |
| מצפה דני (il-31.8812-35.3144) | flat | none | minaret 2 | minaret 2 |
| קדם ערבה (il-31.8070-35.4995) | flat | none | 0 | 0 |
| בית הערבה (il-31.8087-35.4774) | flat | none | synagogue 1 | synagogue 1 |
| עקבת ג'בר (il-31.8395-35.4419) | flat | mosque-only | minaret 3 | minaret 3 |
| עין אל סולטן (il-31.8756-35.4455) | flat | mosque-only | minaret 2 | minaret 2 |
| ורד יריחו (il-31.8262-35.4324) | flat | none | 0 | 0 |
| بدوين (il-31.8976-35.4194) | flat | mosque-only | minaret 1 | minaret 1 |
| בית חוגלה (il-31.8211-35.5072) | flat | none | 0 | 0 |
| פלמחים (il-31.9334-34.7073) | flat | none | synagogue 1 | synagogue 1 |
| צפריה (il-32.0053-34.8551) | flat | synagogue-only | 0 | 0 |
| כפר דניאל (il-31.9333-34.9326) | flat | none | 0 | 0 |
| מבוא מודיעים (il-31.9345-34.9872) | flat | none | minaret 1 | minaret 1 |
| בן שמן (il-31.9523-34.9219) | flat | none | synagogue 1 | synagogue 1 |
| כפר הנוער בן שמן (il-31.9593-34.9293) | flat | none | synagogue 2 | synagogue 2 |
| בודרוס (il-31.9661-34.9927) | flat | mosque-only | minaret 1 | minaret 1 |
| קיביא (il-31.9774-35.0112) | flat | mosque-only | minaret 1 | minaret 1 |
| חדיד (il-31.9683-34.9337) | flat | none | synagogue 2 | synagogue 2 |
| בית נחמיה (il-31.9758-34.9551) | flat | none | 0 | 0 |
| טירת יהודה (il-32.0141-34.9334) | flat | synagogue-only | 0 | 0 |
| כפר טרומן (il-31.9806-34.9217) | flat | none | 0 | 0 |
| כפר רות (il-31.9108-35.0358) | flat | none | minaret 1 | minaret 1 |
| כפר האורנים (il-31.9198-35.0369) | flat | none | minaret 1 | minaret 1 |
| בילעין (il-31.9286-35.0720) | flat | mosque-only | minaret 2 | minaret 2 |
| כפר ניעמה (il-31.9271-35.0941) | flat | mosque-only | minaret 3, synagogue 2 | minaret 3, synagogue 2 |
| מודיעין עילית (il-31.9324-35.0433) | flat | mixed | synagogue 2 | synagogue 2 |
| מתתיהו (il-31.9298-35.0346) | flat | none | minaret 1 | minaret 1 |
| דיר קדיס (il-31.9488-35.0457) | flat | mosque-only | minaret 2 | minaret 2 |
| ח'ירבת בני חארת (il-31.9465-35.0724) | flat | mosque-only | minaret 3, synagogue 1 | minaret 3, synagogue 1 |
| אל-מידיה (il-31.9357-35.0042) | flat | mosque-only | minaret 2, synagogue 1 | minaret 2, synagogue 1 |
| שדה אפרים (il-31.9398-35.0919) | flat | none | minaret 1 | minaret 1 |
| נעלין (il-31.9456-35.0222) | flat | mosque-only | minaret 1 | minaret 1 |
| ראס כרכר (il-31.9423-35.1043) | flat | mosque-only | synagogue 1 | synagogue 1 |
| אל-ג'ניה (il-31.9390-35.1204) | flat | mosque-only | minaret 2, synagogue 1 | minaret 2, synagogue 1 |
| ניל"י (il-31.9640-35.0472) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-איתחאד (il-31.9689-35.1034) | flat | mosque-only | minaret 3 | minaret 3 |
| שוקבא (il-31.9865-35.0391) | flat | mosque-only | minaret 1 | minaret 1 |
| דיר אבו משעל (il-31.9988-35.0683) | flat | mosque-only | minaret 1 | minaret 1 |
| עין עריכ (il-31.9062-35.1429) | flat | mosque+church | church 1, minaret 3 | church 1, minaret 3 |
| דולב (il-31.9262-35.1351) | flat | mixed | synagogue 1 | synagogue 1 |
| חרשה (il-31.9447-35.1489) | flat | mixed | church 1, minaret 2 | church 1, minaret 2 |
| אבו קש (il-31.9513-35.1840) | flat | mosque-only | minaret 4 | minaret 4 |
| ביר זית (il-31.9703-35.1953) | flat | mosque-only | minaret 2 | minaret 2 |
| ג'יפנא (il-31.9624-35.2163) | flat | mosque-only | minaret 2 | minaret 2 |
| אל-מזרעה אל-קבליה (il-31.9540-35.1611) | flat | mosque-only | minaret 1 | minaret 1 |
| א-זייתונה (il-31.9601-35.1695) | flat | mosque-only | minaret 2 | minaret 2 |
| אבו שחידם (il-31.9656-35.1708) | flat | mosque-only | minaret 2 | minaret 3 |
| נריה ב' (il-31.9506-35.1354) | flat | none | synagogue 1 | synagogue 1 |
| כרם רעים (il-31.9587-35.1381) | flat | none | synagogue 1 | synagogue 1 |
| נחליאל (il-31.9737-35.1402) | flat | none | 0 | 0 |
| כובאר (il-31.9887-35.1577) | flat | mosque-only | minaret 3 | minaret 3 |
| עטארה (il-32.0030-35.2071) | flat | mosque-only | minaret 2 | minaret 2 |
| דיר דיבוואן (il-31.9113-35.2689) | flat | mosque-only | minaret 2 | minaret 2 |
| גבעת אסף (il-31.9113-35.2479) | flat | none | minaret 1 | minaret 1 |
| ביתין (il-31.9259-35.2398) | flat | mixed | minaret 4, synagogue 1 | minaret 4, synagogue 1 |
| רמון (il-31.9312-35.2995) | flat | mosque-only | minaret 2, synagogue 1 | minaret 2, synagogue 1 |
| טייבה (il-31.9533-35.3006) | flat | none | synagogue 1 | synagogue 1 |
| דיר ג'ריר (il-31.9651-35.2939) | flat | mosque-only | minaret 2 | minaret 2 |
| חוות חסד לאברהם (il-31.9738-35.2891) | flat | mosque-only | minaret 1 | minaret 1 |
| עין יברוד (il-31.9511-35.2508) | flat | mixed | minaret 4 | minaret 4 |
| דורא אל-קרע (il-31.9591-35.2293) | flat | mosque-only | minaret 2 | minaret 2 |
| עין סיניא (il-31.9714-35.2278) | flat | mosque-only | minaret 2, synagogue 2 | minaret 2, synagogue 2 |
| סילואד (il-31.9751-35.2625) | flat | mosque-only | minaret 3 | minaret 3 |
| יברוד (il-31.9762-35.2441) | flat | mosque-only | minaret 1 | minaret 1 |
| כפר מאלכ (il-31.9894-35.3091) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-מזרעה א-שרקיה (il-32.0022-35.2810) | flat | mosque-only | minaret 2 | minaret 2 |
| קול דודי (il-31.9462-35.3433) | flat | none | synagogue 1 | synagogue 1 |
| מצפה כרמים (il-31.9575-35.3569) | flat | none | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| חוות שלישה (il-31.9996-35.3349) | flat | synagogue-only | 0 | 0 |
| נעמה (il-31.9068-35.4672) | flat | none | 0 | 0 |
| אל-עווג'א (il-31.9490-35.4655) | flat | mosque-only | minaret 1 | minaret 1 |
| ייט"ב (il-31.9475-35.4241) | flat | none | 0 | 0 |
| נערן (il-31.9669-35.4549) | flat | none | 0 | 0 |
| נתיב הגדוד (il-31.9883-35.4451) | flat | none | 0 | 0 |
| גלגל (il-31.9997-35.4452) | flat | none | 0 | 0 |
| מגשימים (il-32.0470-34.8993) | flat | synagogue-only | 0 | 0 |
| בני עטרות (il-32.0236-34.9119) | flat | none | 0 | 0 |
| בארות יצחק (il-32.0394-34.9109) | flat | synagogue-only | 0 | 0 |
| נופך (il-32.0436-34.9207) | flat | none | 0 | 0 |
| רינתיה (il-32.0433-34.9317) | flat | none | 0 | 0 |
| מזור (il-32.0523-34.9234) | flat | none | 0 | 0 |
| אלעד (il-32.0501-34.9522) | flat | synagogue-only | 0 | 0 |
| נחשונים (il-32.0615-34.9492) | flat | none | 0 | 0 |
| ראש העין (il-32.0953-34.9533) | flat | synagogue-only | 0 | 0 |
| כפר קאסם (il-32.1152-34.9753) | flat | mosque-only | 0 | 0 |
| חגור (il-32.1376-34.9482) | flat | none | minaret 2 | minaret 2 |
| כפר ברא (il-32.1311-34.9703) | flat | mosque-only | minaret 2 | minaret 2 |
| חורשים (il-32.1372-34.9707) | flat | mosque-only | minaret 2 | minaret 2 |
| ג'לג'וליה (il-32.1523-34.9537) | flat | mosque-only | minaret 2 | minaret 2 |
| שדי חמד (il-32.1598-34.9436) | flat | none | minaret 1 | minaret 1 |
| עינת (il-32.0828-34.9394) | flat | none | 0 | 0 |
| גבעת השלושה (il-32.0981-34.9211) | flat | none | 0 | 0 |
| עבוד (il-32.0155-35.0691) | flat | mixed | church 1 | church 1 |
| רנתיס (il-32.0288-35.0191) | flat | mosque-only | minaret 1 | minaret 1 |
| בני זייד אל-ע'רביה (il-32.0319-35.1039) | flat | mosque-only | minaret 1 | minaret 1 |
| א-לובאן (il-32.0351-35.0397) | flat | mosque-only | minaret 1 | minaret 1 |
| דיר בלוט (il-32.0648-35.0255) | flat | mosque-only | minaret 1 | minaret 1 |
| לשם (il-32.0697-35.0508) | flat | synagogue-only | 0 | 0 |
| עלי זהב (il-32.0711-35.0633) | flat | none | 0 | 0 |
| ראפאת (il-32.0775-35.0443) | flat | mosque-only | minaret 1 | minaret 1 |
| ברוכין (il-32.0821-35.0907) | flat | mixed | synagogue 1 | synagogue 1 |
| א-זאוויה (il-32.0950-35.0400) | flat | mosque-only | minaret 1 | minaret 1 |
| דיר ניד'אם (il-32.0030-35.1140) | flat | mosque-only | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| נווה צוף (il-32.0063-35.1269) | flat | synagogue-only | 0 | 0 |
| נבי סלאח (il-32.0153-35.1255) | flat | mixed | minaret 2 | minaret 2 |
| רוואבי (il-32.0119-35.1902) | flat | mosque-only | 0 | 0 |
| אום צפא (il-32.0084-35.1659) | flat | mosque-only | minaret 1 | minaret 1 |
| עג'ול (il-32.0225-35.1796) | flat | mosque-only | minaret 1 | minaret 1 |
| דיר א-סודאן (il-32.0314-35.1491) | flat | mosque-only | minaret 3 | minaret 3 |
| עבווין (il-32.0326-35.2023) | flat | mosque-only | minaret 2 | minaret 2 |
| קראוות בני זייד (il-32.0535-35.1283) | flat | mosque-only | minaret 2 | minaret 2 |
| כפר עין (il-32.0472-35.1201) | flat | mosque-only | minaret 1 | minaret 1 |
| פרח'ה (il-32.0689-35.1503) | flat | mosque-only | minaret 2 | minaret 2 |
| סלפית (il-32.0852-35.1815) | flat | mixed | minaret 2 | minaret 2 |
| ברקן (il-32.1066-35.1066) | flat | mixed | minaret 1 | minaret 1 |
| קריית נטפים (il-32.1165-35.1127) | flat | mixed | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| מעלה ישראל (il-32.1159-35.1051) | flat | none | 0 | 0 |
| מרדה (il-32.1143-35.1956) | flat | mosque-only | minaret 2 | minaret 2 |
| ח'ירבת אבו פלאח (il-32.0167-35.2998) | flat | mosque-only | minaret 1 | minaret 1 |
| ג'לג'יליה (il-32.0280-35.2293) | flat | mosque-only | minaret 1 | minaret 1 |
| סינג'יל (il-32.0328-35.2646) | flat | mosque-only | minaret 2 | minaret 2 |
| תורמוסעייא (il-32.0357-35.2859) | flat | mosque-only | minaret 2 | minaret 2 |
| שילה (il-32.0552-35.2995) | flat | mixed | synagogue 1 | synagogue 1 |
| عمورية (il-32.0633-35.2096) | flat | none | minaret 1 | minaret 1 |
| נווה שיר (il-32.0669-35.2534) | flat | none | 0 | 0 |
| נאות אילן (il-32.0732-35.2668) | flat | none | 0 | 0 |
| נווה שהם (il-32.0776-35.2732) | flat | synagogue-only | 0 | 0 |
| נוף הרים (il-32.0759-35.2775) | flat | none | 0 | 0 |
| קריות (il-32.0707-35.2937) | flat | mosque-only | minaret 3 | minaret 3 |
| ג'אלוד (il-32.0677-35.3164) | flat | mosque-only | minaret 2 | minaret 2 |
| היובל (il-32.0682-35.2863) | flat | none | 0 | 0 |
| א-סאוויה (il-32.0846-35.2580) | flat | mosque-only | minaret 1 | minaret 1 |
| תלפית (il-32.0862-35.2915) | flat | mosque-only | minaret 1 | minaret 1 |
| קבלאן (il-32.1022-35.2877) | flat | mosque-only | minaret 3 | minaret 3 |
| נופי נחמיה (il-32.0983-35.2360) | flat | none | 0 | 0 |
| רחלים (il-32.1028-35.2570) | flat | none | 0 | 0 |
| יתמא (il-32.1091-35.2693) | flat | mosque-only | minaret 3 | minaret 3 |
| אל-מוע'ייר (il-32.0198-35.3462) | flat | mosque-only | minaret 1 | minaret 1 |
| מלאכי השלום (il-32.0253-35.3648) | flat | none | 0 | 0 |
| עדי עד (il-32.0414-35.3346) | flat | none | 0 | 0 |
| עמיחי (il-32.0458-35.3278) | flat | none | minaret 1 | minaret 1 |
| גאולת ציון (il-32.0461-35.3231) | flat | none | 0 | 0 |
| ישוב הדעת (il-32.0467-35.3404) | flat | none | 0 | 0 |
| קידה (il-32.0508-35.3404) | flat | synagogue-only | 0 | 0 |
| שבות רחל (il-32.0547-35.3115) | flat | none | 0 | 0 |
| קידה מזרח (il-32.0517-35.3460) | flat | none | 0 | 0 |
| אחיה (il-32.0608-35.3276) | flat | none | 0 | 0 |
| אש קודש (il-32.0654-35.3359) | flat | none | minaret 1 | minaret 1 |
| מג׳דל בני פאדל (il-32.0836-35.3633) | flat | mosque-only | minaret 1 | minaret 1 |
| קוסרא (il-32.0843-35.3304) | flat | mosque-only | minaret 5 | minaret 5 |
| ג'וריש (il-32.1019-35.3227) | flat | mosque-only | minaret 1 | minaret 1 |
| גיתית (il-32.1015-35.3962) | flat | none | 0 | 0 |
| תומר (il-32.0187-35.4392) | flat | none | 0 | 0 |
| פסאיל (il-32.0260-35.4447) | flat | mosque-only | minaret 1 | minaret 1 |
| פסאילאל-ווסטא (il-32.0307-35.4399) | flat | none | 0 | 0 |
| פסאייל אל פוקה (il-32.0344-35.4365) | flat | mosque-only | minaret 1 | minaret 1 |
| פצאל (il-32.0438-35.4423) | flat | none | 0 | 0 |
| יפית (il-32.0623-35.4743) | flat | none | 0 | 0 |
| מעלה אפרים (il-32.0708-35.4034) | flat | none | 0 | 0 |
| שלומציון (il-32.0996-35.4941) | flat | none | 0 | 0 |
| נווה ירק (il-32.1333-34.9242) | flat | synagogue-only | 0 | 0 |
| עזבת סלמאן (il-32.1432-34.9973) | flat | mosque-only | 0 | 0 |
| עזבת ג'לעוד (il-32.1511-34.9986) | flat | none | 0 | 0 |
| ירחיב (il-32.1531-34.9683) | flat | none | minaret 2 | minaret 2 |
| מתן (il-32.1561-34.9743) | flat | none | minaret 1 | minaret 1 |
| חבלה (il-32.1647-34.9768) | flat | mosque-only | minaret 3 | minaret 3 |
| ראס עטיה (il-32.1598-34.9885) | flat | mosque-only | 0 | 0 |
| ערב א-רמאד'ין אל-ג'נובי (il-32.1744-34.9896) | flat | none | minaret 1 | minaret 1 |
| קלקיליה (il-32.1881-34.9679) | flat | mosque-only | minaret 2 | minaret 2 |
| אבו סנינא (il-32.1837-34.9558) | flat | mixed | minaret 3 | minaret 3 |
| ניר אליהו (il-32.1974-34.9484) | flat | none | minaret 1 | minaret 1 |
| צופים (il-32.1982-35.0097) | flat | none | minaret 2 | minaret 2 |
| סרטה (il-32.1034-35.0925) | flat | mosque-only | minaret 1 | minaret 1 |
| בידיא (il-32.1147-35.0756) | flat | mosque-only | minaret 1 | minaret 1 |
| מסחה (il-32.1100-35.0511) | flat | mosque-only | minaret 1 | minaret 1 |
| שערי תקוה (il-32.1206-35.0293) | flat | none | 0 | 0 |
| בית אמין (il-32.1318-35.0211) | flat | mosque-only | 0 | 0 |
| עזון עתמה (il-32.1230-35.0170) | flat | mosque-only | 0 | 0 |
| מגן דן (il-32.1103-35.0211) | flat | synagogue-only | 0 | 0 |
| קרואת בני חסן (il-32.1258-35.0993) | flat | mosque-only | minaret 2 | minaret 2 |
| סניריא (il-32.1290-35.0474) | flat | mosque-only | minaret 2 | minaret 2 |
| חוות דורות (il-32.1372-35.0619) | flat | none | 0 | 0 |
| עזבת אל-אשקר (il-32.1405-35.0203) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-מודוור (il-32.1433-35.0122) | flat | mosque-only | minaret 1 | minaret 1 |
| כפר ת'ולת' (il-32.1528-35.0463) | flat | mosque-only | minaret 2 | minaret 2 |
| Shlul Al Raba'a - Kafr thulth town (il-32.1536-35.0588) | flat | none | 0 | 0 |
| נופים (il-32.1553-35.1009) | flat | none | 0 | 0 |
| חוות יאיר (il-32.1443-35.1048) | flat | none | 0 | 0 |
| ראס טירה (il-32.1619-35.0101) | flat | mosque-only | 0 | 0 |
| נבי אליאס (il-32.1845-35.0177) | flat | mosque-only | minaret 1 | minaret 1 |
| עזבת טביב (il-32.1819-35.0337) | flat | mosque-only | minaret 1 | minaret 1 |
| כפר לאקף (il-32.1831-35.0914) | flat | mixed | minaret 2 | minaret 2 |
| עזון (il-32.1761-35.0588) | flat | mixed | minaret 1 | minaret 1 |
| עסלה (il-32.1728-35.0341) | flat | mosque-only | minaret 1 | minaret 1 |
| חרבת סיר (il-32.1960-35.0605) | flat | mosque-only | 0 | 0 |
| ג'יוס (il-32.2007-35.0354) | flat | mosque-only | 0 | 0 |
| חארס (il-32.1140-35.1406) | flat | mosque-only | minaret 3 | minaret 3 |
| רבבה (il-32.1191-35.1276) | flat | synagogue-only | 0 | 0 |
| דיר איסתיא (il-32.1291-35.1409) | flat | mosque-only | minaret 1 | minaret 1 |
| ג'מאעין (il-32.1317-35.2022) | flat | mosque-only | minaret 3 | minaret 3 |
| אלוני שילה (il-32.1630-35.1201) | flat | none | 0 | 0 |
| ג'ינסאפות (il-32.1801-35.1304) | flat | mosque-only | minaret 1 | minaret 1 |
| רמת גלעד (il-32.1784-35.1144) | flat | synagogue-only | 0 | 0 |
| חוות יתדות (il-32.1910-35.1825) | flat | none | 0 | 0 |
| חוות גלעד (il-32.1995-35.1816) | flat | none | 0 | 0 |
| באקת אל-חטב (il-32.2046-35.1151) | flat | none | 0 | 0 |
| איסכאכא (il-32.1028-35.2243) | flat | mosque-only | minaret 2 | minaret 2 |
| יאסוף (il-32.1098-35.2399) | flat | mosque-only | minaret 4 | minaret 4 |
| כפר תפוח (il-32.1191-35.2501) | flat | synagogue-only | 0 | 0 |
| ביתא (il-32.1423-35.2857) | flat | mosque-only | minaret 3 | minaret 3 |
| חוארה (il-32.1521-35.2571) | flat | mosque-only | minaret 4 | minaret 4 |
| אודלא (il-32.1554-35.2762) | flat | mosque-only | minaret 3 | minaret 3 |
| עוורתא (il-32.1616-35.2858) | flat | mixed | minaret 5 | minaret 5 |
| עינאבוס (il-32.1481-35.2455) | flat | mosque-only | minaret 3 | minaret 3 |
| עוריף (il-32.1594-35.2253) | flat | none | minaret 1 | minaret 1 |
| חוות שקד (il-32.1626-35.2406) | flat | none | 0 | 0 |
| יצהר (il-32.1686-35.2338) | flat | synagogue-only | 0 | 0 |
| תקומה (il-32.1581-35.2420) | flat | synagogue-only | 0 | 0 |
| להבה (il-32.1624-35.2474) | flat | none | 0 | 0 |
| שלהבת (il-32.1706-35.2282) | flat | synagogue-only | 0 | 0 |
| עסירה אל-קבליה (il-32.1791-35.2159) | flat | mosque-only | minaret 2 | minaret 2 |
| מאדמא (il-32.1856-35.2313) | flat | mosque-only | minaret 2 | minaret 2 |
| סנה יעקב (il-32.1786-35.2624) | flat | none | minaret 3 | minaret 3 |
| בורין (il-32.1832-35.2501) | flat | mosque-only | minaret 3 | minaret 3 |
| כפר קליל (il-32.1913-35.2758) | flat | mosque-only | minaret 4 | minaret 4 |
| מ.פ. בלטה (il-32.2055-35.2865) | flat | mosque-only | minaret 4 | minaret 4 |
| רוג'יב (il-32.1901-35.2940) | flat | mosque-only | minaret 3 | minaret 3 |
| שכם (il-32.2205-35.2569) | flat | mosque-only | minaret 2 | minaret 2 |
| מ.פ. עסכר (אל-קדים) (il-32.2202-35.2978) | flat | mosque-only | minaret 3 | minaret 3 |
| מ.פ. עסכר (אל- ג'דיד) (il-32.2146-35.3044) | flat | none | minaret 1 | minaret 1 |
| מסאכין (il-32.2287-35.3022) | flat | mosque-only | minaret 2 | minaret 2 |
| זאואתא (il-32.2463-35.2269) | flat | none | minaret 1 | minaret 1 |
| ג'וניד (il-32.2254-35.2192) | flat | mosque-only | minaret 3 | minaret 3 |
| בית וזן (il-32.2302-35.2157) | flat | mosque-only | minaret 2 | minaret 2 |
| בית איבא (il-32.2374-35.2107) | flat | mosque-only | minaret 2 | minaret 2 |
| תל (il-32.1989-35.2130) | flat | mosque-only | minaret 3 | minaret 3 |
| עיראק בורין (il-32.2014-35.2413) | flat | mosque-only | minaret 2 | minaret 2 |
| עקרבה (il-32.1270-35.3438) | flat | mosque-only | minaret 2 | minaret 2 |
| אוסרין (il-32.1251-35.3106) | flat | mosque-only | minaret 3 | minaret 3 |
| הר ינון (il-32.1534-35.3662) | flat | none | 0 | 0 |
| גבעה 782 (il-32.1593-35.3309) | flat | none | 0 | 0 |
| חוות אלומות (il-32.1607-35.3342) | flat | none | 0 | 0 |
| גבעה 851 (il-32.1667-35.3360) | flat | none | 0 | 0 |
| גבעות עולם (il-32.1611-35.3528) | flat | none | 0 | 0 |
| בית פוריכ (il-32.1791-35.3349) | flat | mosque-only | minaret 3 | minaret 3 |
| בית דג'ן (il-32.1919-35.3721) | flat | mosque-only | minaret 1 | minaret 1 |
| משואה (il-32.1129-35.4920) | flat | none | 0 | 0 |
| אל-ג'פתליק (il-32.1439-35.4971) | flat | none | 0 | 0 |
| חלת אל-פולה (il-32.1558-35.4699) | flat | none | 0 | 0 |
| מכורה (il-32.1649-35.4230) | flat | none | 0 | 0 |
| אל- מספה (il-32.1625-35.4809) | flat | none | 0 | 0 |
| פרוש בית דג'ן (il-32.1847-35.4543) | flat | none | 0 | 0 |
| חמרה (il-32.1995-35.4367) | flat | none | 0 | 0 |
| זובידאת (il-32.1725-35.5300) | flat | none | 0 | 0 |
| ארגמן (il-32.1729-35.5223) | flat | none | 0 | 0 |
| מרג' נעג'ה (il-32.1847-35.5379) | flat | none | 0 | 0 |
| בצרה (il-32.2143-34.8780) | flat | none | minaret 1 | minaret 1 |
| בני ציון (il-32.2204-34.8687) | flat | synagogue-only | 0 | 0 |
| חרוצים (il-32.2275-34.8641) | flat | none | 0 | 0 |
| ארסוף (il-32.2141-34.8168) | flat | none | 0 | 0 |
| שפיים (il-32.2169-34.8248) | flat | none | 0 | 0 |
| געש (il-32.2289-34.8235) | flat | none | 0 | 0 |
| יקום (il-32.2486-34.8421) | flat | none | 0 | 0 |
| תל יצחק (il-32.2560-34.8693) | flat | none | 0 | 0 |
| בית יהושע (il-32.2593-34.8660) | flat | none | 0 | 0 |
| אבן יהודה (il-32.2725-34.8868) | flat | synagogue-only | 0 | 0 |
| אודים (il-32.2648-34.8469) | flat | synagogue-only | 0 | 0 |
| נורדיה (il-32.3148-34.8962) | flat | none | 0 | 0 |
| גנות הדר (il-32.3195-34.9001) | flat | none | 0 | 0 |
| גבעת שפירא (il-32.3579-34.8763) | flat | none | 0 | 0 |
| בת חן (il-32.3603-34.8723) | flat | none | 0 | 0 |
| קדימה (il-32.2764-34.9125) | flat | synagogue-only | 0 | 0 |
| אייל (il-32.2114-34.9790) | flat | none | 0 | 0 |
| כוכב יאיר צור יגאל (il-32.2202-34.9939) | flat | synagogue-only | 0 | 0 |
| רמת הכובש (il-32.2153-34.9393) | flat | none | 0 | 0 |
| משמרת (il-32.2280-34.9220) | flat | none | 0 | 0 |
| טירה (il-32.2347-34.9545) | flat | mosque-only | minaret 1 | minaret 1 |
| חרות (il-32.2403-34.9150) | flat | none | 0 | 0 |
| תל מונד (il-32.2537-34.9185) | flat | synagogue-only | 0 | 0 |
| עין ורד (il-32.2653-34.9318) | flat | none | 0 | 0 |
| כפר הס (il-32.2458-34.9340) | flat | none | 0 | 0 |
| עין שריד (il-32.2741-34.9354) | flat | none | 0 | 0 |
| כפר עבודה (il-32.2570-34.9421) | flat | none | 0 | 0 |
| צור יצחק (il-32.2412-34.9984) | flat | mosque-only | minaret 1 | minaret 1 |
| טייבה (il-32.2671-35.0089) | flat | mosque-only | 0 | 0 |
| יעף (il-32.2683-34.9659) | flat | none | 0 | 0 |
| קלנסווה (il-32.2849-34.9802) | flat | mosque-only | 0 | 0 |
| תנובות (il-32.3052-34.9621) | flat | none | minaret 2 | minaret 2 |
| שער אפרים (il-32.2890-34.9974) | flat | none | minaret 1 | minaret 1 |
| פורת (il-32.2763-34.9495) | flat | none | 0 | 0 |
| צורן (il-32.2881-34.9451) | flat | synagogue-only | 0 | 0 |
| גאולים (il-32.2963-34.9474) | flat | none | 0 | 0 |
| כפר זיבאד (il-32.2231-35.0712) | flat | mosque-only | 0 | 0 |
| כפר עבוש (il-32.2222-35.0851) | flat | mosque-only | minaret 1 | minaret 1 |
| פלאמיה (il-32.2253-35.0231) | flat | mosque-only | minaret 1 | minaret 1 |
| צור נתן (il-32.2407-35.0139) | flat | none | 0 | 0 |
| סלעית (il-32.2428-35.0508) | flat | none | minaret 1 | minaret 1 |
| אל-ראס (il-32.2514-35.0636) | flat | mosque-only | minaret 2 | minaret 2 |
| ח'רבת ג'בארה (il-32.2690-35.0419) | flat | mosque-only | 0 | 0 |
| שופה (il-32.2747-35.0837) | flat | mosque-only | minaret 1 | minaret 1 |
| עזבת שופה (il-32.2816-35.0478) | flat | mosque-only | minaret 1 | minaret 1 |
| פרעון (il-32.2860-35.0234) | flat | mosque-only | minaret 1 | minaret 1 |
| טולכרם (il-32.3111-35.0275) | flat | mosque-only | minaret 1 | minaret 1 |
| ד'ינבה (il-32.3134-35.0444) | flat | mosque-only | minaret 1 | minaret 1 |
| איכתאבא (il-32.3237-35.0473) | flat | mosque-only | minaret 1 | minaret 1 |
| מ.פ. נור שמס (il-32.3180-35.0598) | flat | mosque-only | 0 | 0 |
| כתאבא (il-32.3264-35.0534) | flat | mosque-only | minaret 1 | minaret 1 |
| שוויקה (il-32.3357-35.0358) | flat | mosque-only | 0 | 0 |
| מצפה ישי (il-32.2066-35.1589) | flat | synagogue-only | 0 | 0 |
| קדומים דרום (il-32.2122-35.1613) | flat | synagogue-only | 0 | 0 |
| אשקוביות קרוונים (il-32.2133-35.1545) | flat | synagogue-only | 0 | 0 |
| גת קדומים (il-32.2305-35.1641) | flat | synagogue-only | 0 | 0 |
| קדומים מזרח (il-32.2058-35.1655) | flat | synagogue-only | 0 | 0 |
| סרה (il-32.2096-35.1902) | flat | mosque-only | minaret 1 | minaret 1 |
| הר חמד (il-32.2303-35.1519) | flat | synagogue-only | 0 | 0 |
| קוסין (il-32.2378-35.1865) | flat | mosque-only | minaret 2 | minaret 2 |
| דיר שרף (il-32.2541-35.1891) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-נאקורה (il-32.2654-35.2003) | flat | mosque-only | minaret 1 | minaret 1 |
| ראמין (il-32.2857-35.1499) | flat | mosque-only | minaret 1 | minaret 1 |
| כפר אל-לבד (il-32.2961-35.1075) | flat | mosque-only | minaret 1 | minaret 1 |
| בורקה (il-32.3012-35.1943) | flat | mosque-only | minaret 2 | minaret 2 |
| ענבתא (il-32.3073-35.1161) | flat | mosque-only | minaret 2 | minaret 2 |
| קריית לוזה (il-32.2041-35.2687) | flat | none | minaret 1 | minaret 1 |
| עסירה א-שמאליה (il-32.2515-35.2674) | flat | mosque-only | minaret 1 | minaret 1 |
| טלוזה (il-32.2707-35.2949) | flat | none | 0 | 0 |
| איג'ניסיניא (il-32.2729-35.2166) | flat | mosque-only | minaret 1 | minaret 1 |
| נסף ג'ביל (il-32.2833-35.2201) | flat | none | minaret 2 | minaret 2 |
| בית אימרין (il-32.2921-35.2157) | flat | mosque-only | minaret 2 | minaret 2 |
| יאסיד (il-32.2965-35.2782) | flat | none | 0 | 0 |
| סאלם (il-32.2091-35.3331) | flat | mosque-only | minaret 2 | minaret 3 |
| דיר אל-חטב (il-32.2171-35.3219) | flat | mosque-only | minaret 3 | minaret 3 |
| חוות סקאלי (il-32.2143-35.3706) | flat | none | 0 | 0 |
| עזמוט (il-32.2226-35.3100) | flat | mosque-only | minaret 3 | minaret 3 |
| בית חסאן (il-32.2391-35.4040) | flat | none | 0 | 0 |
| בקעות (il-32.2428-35.4537) | flat | none | 0 | 0 |
| אל-חדידייה (il-32.2426-35.5006) | flat | none | 0 | 0 |
| רועי (il-32.2476-35.4885) | flat | none | 0 | 0 |
| חמדת (il-32.2514-35.5263) | flat | none | 0 | 0 |
| כפר ידידיה (il-32.3449-34.9000) | flat | none | 0 | 0 |
| הדר עם (il-32.3491-34.9006) | flat | none | 0 | 0 |
| כפר מונש (il-32.3475-34.9162) | flat | none | 0 | 0 |
| צוקי ים (il-32.3614-34.8587) | flat | none | 0 | 0 |
| בית ינאי (il-32.3775-34.8630) | flat | none | 0 | 0 |
| כפר ויתקין (il-32.3809-34.8752) | flat | none | 0 | 0 |
| בית חרות (il-32.3758-34.8741) | flat | none | 0 | 0 |
| מכמורת (il-32.4063-34.8729) | flat | synagogue-only | 0 | 0 |
| ינוב (il-32.3061-34.9505) | flat | none | minaret 2 | minaret 2 |
| כפר יונה (il-32.3145-34.9321) | flat | synagogue-only | 0 | 0 |
| ניצני עוז (il-32.3055-35.0049) | flat | none | 0 | 0 |
| בארותיים (il-32.3219-34.9829) | flat | none | minaret 1 | minaret 1 |
| עולש (il-32.3317-34.9862) | flat | synagogue-only | 0 | 0 |
| גן יאשיה (il-32.3507-34.9954) | flat | synagogue-only | 0 | 0 |
| מעברות (il-32.3640-34.9047) | flat | none | 0 | 0 |
| העוגן (il-32.3619-34.9232) | flat | none | 0 | 0 |
| אומץ (il-32.3715-34.9962) | flat | mosque-only | 0 | 0 |
| אליכין (il-32.4079-34.9249) | flat | synagogue-only | 0 | 0 |
| עין החורש (il-32.3863-34.9400) | flat | none | 0 | 0 |
| גבעת חיים (מאוחד) (il-32.3918-34.9319) | flat | none | 0 | 0 |
| חגלה (il-32.3875-34.9257) | flat | none | 0 | 0 |
| גבעת חיים (איחוד) (il-32.4003-34.9331) | flat | none | 0 | 0 |
| אחיטוב (il-32.3873-34.9914) | flat | synagogue-only | 0 | 0 |
| כפר אבו עיסא (il-32.3951-34.9022) | flat | none | 0 | 0 |
| אל מסקופה (il-32.3369-35.0587) | flat | none | 0 | 0 |
| אל-ג'ארושיה (il-32.3477-35.0500) | flat | mosque-only | minaret 1 | minaret 1 |
| בחן (il-32.3510-35.0191) | flat | synagogue-only | 0 | 0 |
| ימה (il-32.3684-35.0303) | flat | mosque-only | 0 | 0 |
| איבתאן (il-32.3656-35.0472) | flat | none | 0 | 0 |
| עתיל (il-32.3697-35.0718) | flat | mosque-only | minaret 2 | minaret 2 |
| מגל (il-32.3852-35.0352) | flat | mosque-only | 0 | 0 |
| ג’ת (il-32.3988-35.0375) | flat | mosque-only | minaret 1 | minaret 1 |
| זיתא (il-32.3853-35.0499) | flat | mosque-only | minaret 1 | minaret 1 |
| להבות חביבה (il-32.3944-35.0095) | flat | mosque-only | 0 | 0 |
| סילת א-ד'הר (il-32.3197-35.1852) | flat | mosque-only | minaret 5 | minaret 5 |
| פנדקומיה (il-32.3202-35.2039) | flat | mosque-only | minaret 3 | minaret 3 |
| אלעטארה (il-32.3262-35.1618) | flat | mosque-only | minaret 1 | minaret 1 |
| אל רמה (il-32.3561-35.1709) | flat | mosque-only | minaret 3 | minaret 3 |
| עג'ה (il-32.3615-35.1956) | flat | mosque-only | minaret 3 | minaret 3 |
| כפר ראעי (il-32.3746-35.1553) | flat | mosque-only | minaret 2 | minaret 2 |
| סיידא (il-32.3850-35.1193) | flat | mosque-only | minaret 1 | minaret 1 |
| פחמה (il-32.3827-35.1798) | flat | mosque-only | minaret 1 | minaret 1 |
| ג'בע (il-32.3238-35.2216) | flat | mosque-only | minaret 3 | minaret 3 |
| סיריס (il-32.3280-35.2910) | flat | mosque-only | minaret 3 | minaret 3 |
| ג'ודידה (il-32.3355-35.3006) | flat | mosque-only | minaret 3 | minaret 3 |
| שא-נור (il-32.3369-35.2019) | flat | none | 0 | 0 |
| מית'לון (il-32.3478-35.2738) | flat | mosque-only | minaret 2 | minaret 2 |
| סאנור (il-32.3568-35.2459) | flat | mosque-only | minaret 2 | minaret 2 |
| ענזה (il-32.3594-35.2205) | flat | mosque-only | minaret 1 | minaret 1 |
| אל זאויה (il-32.3757-35.2320) | flat | mosque-only | minaret 1 | minaret 1 |
| מיסיליה (il-32.3862-35.2880) | flat | mosque-only | minaret 1 | minaret 1 |
| פחמה אל-ג'דידה (il-32.3893-35.2090) | flat | mosque-only | 0 | 0 |
| אל מנסורה (il-32.3862-35.2163) | flat | mosque-only | minaret 1 | minaret 1 |
| מארקה (il-32.3969-35.2387) | flat | mosque-only | minaret 1 | minaret 1 |
| עראבה (il-32.4047-35.2034) | flat | mosque-only | minaret 3 | minaret 3 |
| טובאס (il-32.3211-35.3689) | flat | mosque-only | minaret 3 | minaret 3 |
| תיאסיר (il-32.3395-35.3965) | flat | mosque-only | minaret 1 | minaret 1 |
| עקאבה (il-32.3507-35.3498) | flat | mosque-only | minaret 1 | minaret 1 |
| סיר (il-32.3633-35.3144) | flat | mosque-only | minaret 2 | minaret 2 |
| כופיר (il-32.3721-35.3411) | flat | mosque-only | minaret 1 | minaret 1 |
| זבאבדה (il-32.3861-35.3248) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-עקאבה (il-32.3375-35.4163) | flat | none | 0 | 0 |
| קרדאלה (il-32.3797-35.4925) | flat | none | 0 | 0 |
| ברדלה (il-32.3862-35.4807) | flat | mosque-only | minaret 1 | minaret 1 |
| ברוש הבקעה (il-32.3195-35.5421) | flat | none | 0 | 0 |
| אל-פאריסייה (il-32.3556-35.5099) | flat | none | 0 | 0 |
| עין אל-בידה (il-32.3807-35.5103) | flat | mosque-only | minaret 1 | minaret 1 |
| שדות ים (il-32.4922-34.8933) | flat | synagogue-only | 0 | 0 |
| קיסריה (il-32.5131-34.9058) | flat | synagogue-only | 0 | 0 |
| ג׳סר א־זרקא (il-32.5376-34.9132) | flat | mosque-only | minaret 2 | minaret 2 |
| בית חנניה (il-32.5283-34.9250) | flat | synagogue-only | 0 | 0 |
| מעגן מיכאל (il-32.5553-34.9167) | flat | none | 0 | 0 |
| שדה יצחק (il-32.4051-34.9938) | flat | none | 0 | 0 |
| גן שמואל (il-32.4518-34.9498) | flat | synagogue-only | 0 | 0 |
| גן השומרון (il-32.4639-34.9984) | flat | synagogue-only | 0 | 0 |
| פרדס חנה-כרכור (il-32.4750-34.9751) | flat | synagogue-only | 0 | 0 |
| עין שמר (il-32.4629-35.0074) | flat | synagogue-only | 0 | 0 |
| כפר פינס (il-32.4839-35.0034) | flat | synagogue-only | 0 | 0 |
| משמרות (il-32.4875-34.9850) | flat | synagogue-only | 0 | 0 |
| עין עירון (il-32.4835-35.0099) | flat | synagogue-only | 0 | 0 |
| באקה אל-גרביה (il-32.4197-35.0428) | flat | mosque-only | 0 | 0 |
| נזלה עיסה (il-32.4162-35.0568) | flat | mosque-only | 0 | 0 |
| באקה א-שרקיה (il-32.4099-35.0702) | flat | mosque-only | minaret 2 | minaret 2 |
| אל-נזלה אל-וסטה (il-32.4086-35.0965) | flat | mosque-only | minaret 1 | minaret 1 |
| קפין (il-32.4336-35.0835) | flat | mosque-only | minaret 2 | minaret 2 |
| עכאבה (il-32.4484-35.0818) | flat | mosque-only | 0 | 0 |
| דהר אל-אבד (il-32.4502-35.0939) | flat | mosque-only | 0 | 0 |
| מצפה אילן (il-32.4615-35.0692) | flat | mixed | 0 | 0 |
| ברטעה (il-32.4743-35.0903) | flat | mosque-only | minaret 1 | minaret 1 |
| ערערה (il-32.4965-35.0956) | flat | none | 0 | 0 |
| כפר קרע (il-32.5030-35.0505) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-נזלה א-שרקיה (il-32.4114-35.1075) | flat | mosque-only | minaret 1 | minaret 1 |
| חרבת אל-חמאם (il-32.4187-35.1279) | flat | none | 0 | 0 |
| מבוא דותן (il-32.4207-35.1748) | flat | none | 0 | 0 |
| חרמש (il-32.4232-35.1188) | flat | none | 0 | 0 |
| מעוז (il-32.4249-35.1651) | flat | none | 0 | 0 |
| אמריחה (il-32.4325-35.1464) | flat | mosque-only | 0 | 0 |
| יעבד (il-32.4463-35.1694) | flat | mosque-only | minaret 2 | minaret 2 |
| נזלת א-שייח' זייד (il-32.4625-35.1754) | flat | mosque-only | minaret 1 | minaret 1 |
| אל נווה (il-32.4378-35.1131) | flat | none | 0 | 0 |
| כופרית (il-32.4435-35.2042) | flat | mosque-only | minaret 1 | minaret 1 |
| זיבדה (il-32.4503-35.1307) | flat | mosque-only | minaret 1 | minaret 1 |
| אום דאר (il-32.4587-35.1350) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-תרם (il-32.4620-35.1898) | flat | mosque-only | minaret 1 | minaret 1 |
| טורה אל-שרקייה (il-32.4662-35.1658) | flat | mosque-only | minaret 1 | minaret 1 |
| טורה אל-גרבייה (il-32.4677-35.1528) | flat | mosque-only | minaret 1 | minaret 1 |
| דהר אל-מאלח (il-32.4732-35.1598) | flat | mosque-only | 0 | 0 |
| ריחן (il-32.4687-35.1352) | flat | none | 0 | 0 |
| אל-עראקה (il-32.4698-35.2009) | flat | mosque-only | 0 | 0 |
| חרבת עבדאללה אל-יונס (il-32.4757-35.1146) | flat | mosque-only | 0 | 0 |
| אום א-ריחאן (il-32.4835-35.1420) | flat | mosque-only | 0 | 0 |
| חרבת סורוג' (il-32.4875-35.1968) | flat | none | 0 | 0 |
| ח'לית אנג'ס (il-32.4967-35.1897) | flat | none | 0 | 0 |
| עאנין (il-32.5012-35.1676) | flat | mosque-only | minaret 2 | minaret 2 |
| מי עמי (il-32.5047-35.1465) | flat | none | 0 | 0 |
| אום אל-פחם (il-32.5158-35.1525) | flat | mosque-only | 0 | 0 |
| קבטייה (il-32.4095-35.2801) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-שוהאדה (il-32.4286-35.2755) | flat | mosque-only | minaret 1 | minaret 1 |
| ביר אל-באשא (il-32.4215-35.2304) | flat | none | minaret 1 | minaret 1 |
| בורקין (il-32.4561-35.2607) | flat | mosque-only | minaret 3 | minaret 3 |
| ג'נין‎ (il-32.4621-35.2976) | flat | mosque-only | minaret 2 | minaret 3 |
| מ.פ. ג'נין (il-32.4605-35.2882) | flat | mosque-only | minaret 3 | minaret 3 |
| עאבא (il-32.4617-35.3240) | flat | none | 0 | 0 |
| כפר קוד (il-32.4568-35.2285) | flat | mosque-only | 0 | 0 |
| אל - האשמיה (il-32.4653-35.2216) | flat | mosque-only | 0 | 0 |
| אל-יאמון (il-32.4838-35.2300) | flat | mosque-only | minaret 2 | minaret 2 |
| כפר דאן (il-32.4775-35.2535) | flat | mosque-only | minaret 2 | minaret 2 |
| תנין (il-32.4151-35.3398) | flat | mosque-only | 0 | 0 |
| אל-מוע'אייר (il-32.4214-35.3862) | flat | mosque-only | minaret 1 | minaret 1 |
| ג'לקמוס (il-32.4254-35.3646) | flat | mosque-only | minaret 1 | minaret 1 |
| דיר אבו ד'עיף (il-32.4554-35.3645) | flat | mosque-only | minaret 1 | minaret 1 |
| בית קאד (il-32.4696-35.3558) | flat | mosque-only | minaret 1 | minaret 1 |
| חרבת אבו ענקר (il-32.4837-35.3794) | flat | none | 0 | 0 |
| פקועה (il-32.4905-35.4011) | flat | mosque-only | minaret 2 | minaret 2 |
| עראנה (il-32.4973-35.3218) | flat | mosque-only | minaret 1 | minaret 1 |
| דיר ע'זאלה (il-32.4957-35.3518) | flat | mosque-only | minaret 1 | minaret 1 |
| אל-מוטילה (il-32.4201-35.4077) | flat | mosque-only | minaret 1 | minaret 1 |
| מלכישוע (il-32.4385-35.4130) | flat | none | 0 | 0 |
| רוויה (il-32.4492-35.4727) | flat | synagogue-only | 0 | 0 |
| מירב (il-32.4534-35.4215) | flat | synagogue-only | 0 | 0 |
| ג'לבון (il-32.4598-35.4153) | flat | mosque-only | minaret 1 | minaret 1 |
| שלוחות (il-32.4715-35.4808) | flat | synagogue-only | 0 | 0 |
| שלפים (il-32.4763-35.4772) | flat | none | 0 | 0 |
| רשפים (il-32.4819-35.4775) | flat | none | 0 | 0 |
| מסילות (il-32.4958-35.4750) | flat | none | 0 | 0 |
| כפר רופין (il-32.4582-35.5568) | flat | none | 0 | 0 |
| נווה איתן (il-32.4921-35.5328) | flat | none | 0 | 0 |
| خربة شيخ محمد (il-32.4990-35.5809) | flat | none | 0 | 0 |
| الحراوية (il-32.4995-35.5821) | flat | none | 0 | 0 |
| בנימינה (il-32.5203-34.9436) | flat | synagogue-only | 0 | 0 |
| אלוני יצחק (il-32.5107-35.0042) | flat | synagogue-only | 0 | 0 |
| אביאל (il-32.5325-34.9934) | flat | none | 0 | 0 |
| מעיין צבי (il-32.5683-34.9401) | flat | none | 0 | 0 |
| פוריידיס (il-32.5988-34.9542) | flat | mosque-only | minaret 2 | minaret 2 |
| כפר הנוער מאיר שפיה (il-32.5915-34.9709) | flat | none | 0 | 0 |
| גבעת ניל"י (il-32.5473-35.0423) | flat | none | synagogue 1 | synagogue 1 |
| גלעד (il-32.5573-35.0757) | flat | none | synagogue 1 | synagogue 1 |
| עמיקם (il-32.5639-35.0205) | flat | none | synagogue 1 | synagogue 1 |
| דליה (il-32.5893-35.0758) | flat | none | synagogue 1 | synagogue 1 |
| רמות מנשה (il-32.5979-35.0577) | flat | none | 0 | 0 |
| עין השופט (il-32.5958-35.1000) | flat | none | synagogue 1 | synagogue 1 |
| א-סעאידה (il-32.5053-35.1987) | flat | none | 0 | 0 |
| טייבה (il-32.5150-35.1842) | flat | mosque-only | minaret 2 | minaret 2 |
| רומאנה (il-32.5239-35.2058) | flat | mosque-only | 0 | 0 |
| סילת אל-חארתיה (il-32.5078-35.2282) | flat | mosque-only | minaret 2 | minaret 2 |
| מוקיבלה (il-32.5140-35.2976) | flat | mosque-only | minaret 1 | minaret 1 |
| תענכ (il-32.5181-35.2207) | flat | mosque-only | minaret 1 | minaret 1 |
| רם און (il-32.5272-35.2590) | flat | none | 0 | 0 |
| זובובא (il-32.5441-35.2234) | flat | mosque-only | minaret 1 | minaret 1 |
| חבר (il-32.5479-35.2644) | flat | none | 0 | 0 |
| יעל (il-32.5519-35.3079) | flat | none | 0 | 0 |
| גדיש (il-32.5588-35.2449) | flat | none | 0 | 0 |
| אומן (il-32.5641-35.2422) | flat | none | 0 | 0 |
| ניר יפה (il-32.5696-35.2453) | flat | none | 0 | 0 |
| ג'למה (il-32.5085-35.3133) | flat | mosque-only | minaret 1 | minaret 1 |
| ערבונה (il-32.5111-35.3639) | flat | mosque-only | minaret 1 | minaret 1 |
| מגן שאול (il-32.5207-35.3067) | flat | none | 0 | 0 |
| סנדלה (il-32.5231-35.3238) | flat | none | 0 | 0 |
| נורית (il-32.5427-35.3560) | flat | none | 0 | 0 |
| תל יוסף (il-32.5561-35.3997) | flat | none | 0 | 0 |
| עין חרוד (il-32.5592-35.3936) | flat | none | 0 | 0 |
| יזרעאל (il-32.5624-35.3213) | flat | none | 0 | 0 |
| גבע (il-32.5663-35.3715) | flat | none | 0 | 0 |
| קיבוץ מרחביה (il-32.6052-35.3077) | flat | synagogue-only | 0 | 0 |
| ניר דוד (il-32.5027-35.4567) | flat | none | 0 | 0 |
| בית אלפא (il-32.5160-35.4313) | flat | none | 0 | 0 |
| חפציבה (il-32.5182-35.4258) | flat | none | 0 | 0 |
| שדה נחום (il-32.5271-35.4816) | flat | none | 0 | 0 |
| בית השיטה (il-32.5511-35.4382) | flat | none | 0 | 0 |
| מולדת (il-32.5861-35.4401) | flat | synagogue-only | 0 | 0 |
| רמת צבי (il-32.5915-35.4145) | flat | none | 0 | 0 |
| חמדיה (il-32.5201-35.5204) | flat | none | 0 | 0 |
| נווה אור (il-32.5887-35.5532) | flat | none | 0 | 0 |
| דור (il-32.6076-34.9231) | flat | mixed | minaret 1 | minaret 1 |
| נחשולים (il-32.6138-34.9206) | flat | none | 0 | 0 |
| הבונים (il-32.6372-34.9328) | flat | none | synagogue 1 | synagogue 1 |
| כרם מהר"ל (il-32.6461-34.9900) | flat | mixed | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| גבע כרמל (il-32.6636-34.9550) | flat | none | 0 | 0 |
| עין כרמל (il-32.6770-34.9531) | flat | none | 0 | 0 |
| נווה ים (il-32.6792-34.9318) | flat | none | 0 | 0 |
| עתלית (il-32.6907-34.9423) | flat | none | 0 | 0 |
| עין הוד (il-32.7005-34.9826) | flat | none | 0 | 0 |
| רמת השופט (il-32.6120-35.0949) | flat | none | 0 | 0 |
| דלית אל-כרמל (il-32.6922-35.0483) | flat | none | 0 | 0 |
| עספיא (il-32.7152-35.0671) | flat | mixed | synagogue 1 | synagogue 1 |
| רמת הדסה (il-32.7292-35.1461) | flat | mixed | synagogue 2 | synagogue 2 |
| נווה עמיאל (il-32.7022-35.1374) | flat | none | minaret 1 | minaret 1 |
| בית שערים (il-32.6962-35.1795) | flat | none | 0 | 0 |
| מזרע (il-32.6510-35.2861) | flat | none | church 2 | church 2 |
| יפעת (il-32.6772-35.2239) | flat | none | minaret 1 | minaret 1 |
| גניגר (il-32.6643-35.2569) | flat | none | church 1 | church 1 |
| גבת (il-32.6747-35.2108) | flat | none | minaret 1 | minaret 1 |
| יפיע נצרת (il-32.6866-35.2772) | flat | mosque-only | 0 | 0 |
| נצרת (il-32.7066-35.3049) | flat | mosque+church | church 1, minaret 1 | church 1, minaret 1 |
| ריינה (il-32.7236-35.3125) | flat | none | minaret 1 | minaret 1 |
| נוף הגליל (il-32.7023-35.3183) | flat | synagogue-only | 0 | 0 |
| משהד (il-32.7402-35.3245) | flat | mosque-only | church 1, minaret 1, synagogue 1 | church 1, minaret 1, synagogue 1 |
| עין מאהל (il-32.7233-35.3527) | flat | mosque-only | 0 | 0 |
| כפר החורש (il-32.7013-35.2742) | flat | none | church 1 | church 1 |
| נעורה (il-32.6140-35.3903) | flat | none | 0 | 0 |
| דחי (il-32.6204-35.3450) | flat | mosque-only | minaret 1 | minaret 1 |
| ניין (il-32.6307-35.3489) | flat | mosque+church | church 1 | church 1 |
| דברת (il-32.6479-35.3505) | flat | none | 0 | 0 |
| אחוזת ברק (il-32.6418-35.3387) | flat | none | 0 | 0 |
| איכסל (il-32.6816-35.3240) | flat | none | 0 | 0 |
| שבלי - אום אל-גנם (il-32.6758-35.3919) | flat | none | minaret 1 | minaret 1 |
| דבוריה (il-32.6928-35.3716) | flat | mosque-only | minaret 2 | minaret 2 |
| שיבלי (il-32.6937-35.3960) | flat | church-only | church 1, minaret 1 | church 1, minaret 1 |
| טמרה (il-32.6343-35.4042) | flat | mosque-only | minaret 1 | minaret 1 |
| כפר מיסר (il-32.6452-35.4229) | flat | mosque-only | church 1, minaret 1 | church 1, minaret 1 |
| עין דור (il-32.6563-35.4170) | flat | none | 0 | 0 |
| שדמות דבורה (il-32.6955-35.4374) | flat | none | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| כדורי (il-32.7039-35.4067) | flat | none | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| גשר (il-32.6206-35.5521) | flat | none | church 1 | church 1 |
| الباقورة (il-32.6420-35.5910) | flat | none | 0 | 0 |
| אשדות יעקב מאוחד (il-32.6621-35.5820) | flat | none | 0 | 0 |
| בית זרע (il-32.6883-35.5734) | flat | none | synagogue 1 | synagogue 1 |
| מסדה (il-32.6831-35.5988) | flat | none | synagogue 1 | synagogue 1 |
| דגניה א' (il-32.7085-35.5749) | flat | none | synagogue 1 | synagogue 1 |
| מעגן (il-32.7067-35.6011) | flat | none | 0 | 0 |
| אל-עדסייה (il-32.6667-35.6239) | flat | none | 0 | 0 |
| אל-מוח'ייבה א-תחתא (il-32.6730-35.6754) | flat | mosque-only | minaret 1 | minaret 1 |
| الحمة الأردنية (il-32.7013-35.6820) | flat | none | 0 | 0 |
| בית אורן (il-32.7306-35.0056) | flat | synagogue-only | 0 | 0 |
| החותרים (il-32.7515-34.9568) | flat | none | 0 | 0 |
| טירת כרמל (il-32.7614-34.9716) | flat | none | 0 | 0 |
| כפר גלים (il-32.7666-34.9593) | flat | none | 0 | 0 |
| נשר (il-32.7709-35.0381) | flat | synagogue-only | 0 | 0 |
| קריית מוצקין (il-32.8364-35.0752) | flat | synagogue-only | 0 | 0 |
| קריית ים (il-32.8502-35.0703) | flat | synagogue-only | 0 | 0 |
| קריית ביאליק (il-32.8286-35.0845) | flat | synagogue-only | 0 | 0 |
| כפר ביאליק (il-32.8204-35.0869) | flat | none | 0 | 0 |
| כפר מסריק (il-32.8911-35.1001) | flat | none | 0 | 0 |
| עין המפרץ (il-32.9036-35.0961) | flat | none | 0 | 0 |
| יגור (il-32.7429-35.0781) | flat | synagogue-only | 0 | 0 |
| כפר הנוער הדתי (il-32.7427-35.1014) | flat | none | synagogue 1 | synagogue 1 |
| כפר חסידים (il-32.7520-35.0936) | flat | none | synagogue 1 | synagogue 1 |
| קרית אתא (il-32.8116-35.1164) | flat | synagogue-only | 0 | 0 |
| אושה (il-32.7955-35.1144) | flat | synagogue-only | 0 | 0 |
| כפר המכבי (il-32.7911-35.1149) | flat | none | 0 | 0 |
| רמת יוחנן (il-32.7925-35.1214) | flat | none | 0 | 0 |
| מנשייה זבדה (il-32.7061-35.1922) | flat | mosque-only | minaret 2 | minaret 2 |
| בית לחם הגלילית (il-32.7346-35.1891) | flat | synagogue-only | 0 | 0 |
| זבידאת (il-32.7325-35.1332) | flat | mosque-only | minaret 1 | minaret 1 |
| בסמת טבעון (il-32.7362-35.1546) | flat | mosque-only | 0 | 0 |
| משאיח א סעדיה (il-32.7422-35.1585) | flat | mosque-only | 0 | 0 |
| כעביה טבאש חג'אג'רה (il-32.7488-35.1841) | flat | mosque-only | minaret 1 | minaret 1 |
| נופית (il-32.7586-35.1474) | flat | none | 0 | 0 |
| הרדוף (il-32.7641-35.1728) | flat | none | 0 | 0 |
| חוואלד (il-32.7708-35.1360) | flat | mosque-only | minaret 1 | minaret 1 |
| שפרעם (il-32.8046-35.1724) | flat | mosque-only | 0 | 0 |
| עיבלין (il-32.8219-35.1922) | flat | mosque-only | minaret 1 | minaret 1 |
| ראס עלי (il-32.7721-35.1542) | flat | none | 0 | 0 |
| גבעת אלונים (il-32.8153-35.1393) | flat | synagogue-only | 0 | 0 |
| תמרת (il-32.7038-35.2253) | flat | none | 0 | 0 |
| עלוט (il-32.7164-35.2594) | flat | mosque-only | church 1, minaret 3 | church 1, minaret 3 |
| עלוט (il-32.7183-35.2613) | flat | mosque-only | church 1, minaret 3 | church 1, minaret 3 |
| גבעת אלה (il-32.7229-35.2451) | flat | none | church 1 | church 1 |
| שמשית (il-32.7328-35.2472) | flat | none | 0 | 0 |
| אלון הגליל (il-32.7573-35.2213) | flat | synagogue-only | 0 | 0 |
| ביר אל מכסור (il-32.7757-35.2217) | flat | none | 0 | 0 |
| מקמאן (il-32.7923-35.2249) | flat | mosque-only | minaret 1 | minaret 1 |
| בית קשת (il-32.7191-35.3943) | flat | none | minaret 1 | minaret 1 |
| כפר כנא (il-32.7460-35.3398) | flat | mosque+church | church 1, minaret 1 | church 1, minaret 1 |
| בית רימון (il-32.7820-35.3278) | flat | synagogue-only | 0 | 0 |
| כפר כמא (il-32.7210-35.4408) | flat | mosque-only | minaret 2, synagogue 1 | minaret 2, synagogue 1 |
| אילניה (il-32.7550-35.4075) | flat | none | 0 | 0 |
| כפר חיטים (il-32.8006-35.5013) | flat | synagogue-only | 0 | 0 |
| אלומות (il-32.7070-35.5463) | flat | none | church 1 | church 1 |
| תל קציר (il-32.7052-35.6178) | flat | none | synagogue 1 | synagogue 1 |
| האון (il-32.7270-35.6236) | flat | none | synagogue 1 | synagogue 1 |
| מבוא חמה (il-32.7364-35.6556) | flat | none | 0 | 0 |
| כפר חרוב (il-32.7632-35.6640) | flat | none | synagogue 1 | synagogue 1 |
| אפיק (il-32.7788-35.7013) | flat | none | 0 | 0 |
| גבעת יואב (il-32.7968-35.6813) | flat | none | 0 | 0 |
| מיצר (il-32.7687-35.7370) | flat | none | 0 | 0 |
| אלי עד (il-32.8047-35.7342) | flat | none | 0 | 0 |
| אפק (il-32.8402-35.1279) | flat | none | 0 | 0 |
| מצפה אביב (il-32.8369-35.2021) | flat | none | 0 | 0 |
| טמרה (il-32.8535-35.1979) | flat | none | 0 | 0 |
| כאבול (il-32.8677-35.2101) | flat | mosque-only | 0 | 0 |
| יסעור (il-32.9011-35.1664) | flat | none | 0 | 0 |
| כפר מנדא (il-32.8114-35.2598) | flat | mosque-only | minaret 1 | minaret 1 |
| דמיידה (il-32.8155-35.2271) | flat | mosque-only | 0 | 0 |
| כאוכב אבו אל-היג'א (il-32.8309-35.2495) | flat | none | 0 | 0 |
| יודפת (il-32.8372-35.2715) | flat | none | 0 | 0 |
| קורנית (il-32.8436-35.2513) | flat | none | 0 | 0 |
| שכניה (il-32.8487-35.2470) | flat | none | 0 | 0 |
| סכנין (il-32.8638-35.3023) | flat | mosque-only | minaret 2 | minaret 2 |
| רקפת (il-32.8547-35.2643) | flat | mosque-only | minaret 1 | minaret 1 |
| עצמון שגב (il-32.8660-35.2512) | flat | synagogue-only | 0 | 0 |
| מנוף (il-32.8541-35.2368) | flat | none | 0 | 0 |
| יעד (il-32.8783-35.2436) | flat | none | 0 | 0 |
| שעב (il-32.8906-35.2384) | flat | mosque-only | minaret 1 | minaret 1 |
| יובלים (il-32.8775-35.2706) | flat | none | minaret 1 | minaret 1 |
| ערב א-נעים (il-32.8876-35.2903) | flat | none | 0 | 0 |
| שורשים (il-32.8924-35.2579) | flat | none | minaret 1 | minaret 1 |
| צורית (il-32.9023-35.2535) | flat | synagogue-only | 0 | 0 |
| גילון (il-32.9029-35.2355) | flat | synagogue-only | 0 | 0 |
| מג'ד אל-כרום (il-32.9226-35.2580) | flat | mosque-only | 0 | 0 |
| בענה (il-32.9281-35.2722) | flat | none | 0 | 0 |
| דיר אל אסד (il-32.9348-35.2668) | flat | mosque-only | minaret 1 | minaret 1 |
| נחף (il-32.9346-35.3176) | flat | mosque-only | minaret 1, synagogue 2 | minaret 1, synagogue 2 |
| סאג׳ור (il-32.9420-35.3422) | flat | none | synagogue 2 | synagogue 2 |
| מצפה נטופה (il-32.8028-35.3830) | flat | mixed | synagogue 1 | synagogue 1 |
| אבטליון (il-32.8362-35.3503) | flat | none | 0 | 0 |
| עראבה (il-32.8486-35.3358) | flat | mosque-only | minaret 2 | minaret 2 |
| יחד (il-32.8453-35.3615) | flat | none | 0 | 0 |
| הררית (il-32.8458-35.3692) | flat | none | 0 | 0 |
| דיר חנא (il-32.8625-35.3667) | flat | mosque-only | minaret 2 | minaret 2 |
| אשבל (il-32.8768-35.3050) | flat | none | minaret 1 | minaret 1 |
| לוטם (il-32.8817-35.3585) | flat | none | 0 | 0 |
| מעלה צביה (il-32.8895-35.3306) | flat | none | minaret 1 | minaret 1 |
| ארבל (il-32.8121-35.4853) | flat | synagogue-only | 0 | 0 |
| ואדי אל-חמאם (il-32.8296-35.4904) | flat | mosque-only | minaret 1 | minaret 1 |
| מגדל (il-32.8387-35.4994) | flat | mixed | synagogue 2 | synagogue 2 |
| מסד (il-32.8441-35.4245) | flat | none | church 1 | church 1 |
| רביד (il-32.8516-35.4634) | flat | none | church 1 | church 1 |
| קדרים (il-32.8984-35.4738) | flat | none | 0 | 0 |
| גינוסר (il-32.8476-35.5236) | flat | mixed | church 1, synagogue 1 | church 1, synagogue 1 |
| רמות (il-32.8498-35.6668) | flat | none | church 1 | church 1 |
| כנף (il-32.8700-35.6983) | flat | none | church 1 | church 1 |
| מעלה גמלא (il-32.8899-35.6848) | flat | none | 0 | 0 |
| גשור (il-32.8192-35.7160) | flat | none | 0 | 0 |
| رزانية صيدا (il-32.8831-35.8616) | flat | none | 0 | 0 |
| אל-בסה א-שרקיה (il-32.8997-35.8781) | flat | none | 0 | 0 |
| עכו (il-32.9282-35.0756) | flat | mixed | minaret 1 | minaret 1 |
| שמרת (il-32.9507-35.0960) | flat | none | church 1, minaret 1 | church 1, minaret 1 |
| לוחמי הגטאות (il-32.9629-35.0974) | flat | none | 0 | 0 |
| שבי ציון (il-32.9806-35.0833) | flat | none | minaret 1 | minaret 1 |
| מזרעה (il-32.9833-35.0983) | flat | mosque-only | 0 | 0 |
| גשר הזיו (il-33.0395-35.1110) | flat | none | 0 | 0 |
| ג׳דיידה-מכר (il-32.9295-35.1467) | flat | none | 0 | 0 |
| ג'וליס (il-32.9431-35.1869) | flat | none | 0 | 0 |
| אבו סנאן (il-32.9586-35.1717) | flat | none | 0 | 0 |
| כפר יאסיף (il-32.9533-35.1657) | flat | none | 0 | 0 |
| ירכא (il-32.9549-35.2088) | flat | none | 0 | 0 |
| נס עמים (il-32.9657-35.1212) | flat | synagogue-only | 0 | 0 |
| בית העמק (il-32.9705-35.1461) | flat | none | 0 | 0 |
| אשרת (il-32.9717-35.1565) | flat | synagogue-only | 0 | 0 |
| עמקה (il-32.9792-35.1643) | flat | mixed | minaret 1 | minaret 1 |
| נתיב השיירה (il-32.9928-35.1355) | flat | synagogue-only | 0 | 0 |
| שייח דנון (il-32.9943-35.1479) | flat | mosque-only | minaret 1 | minaret 1 |
| תובל (il-32.9291-35.2448) | flat | synagogue-only | 0 | 0 |
| פלך (il-32.9339-35.2336) | flat | none | 0 | 0 |
| לבון (il-32.9425-35.2871) | flat | none | 0 | 0 |
| כישור (il-32.9458-35.2495) | flat | none | 0 | 0 |
| לפידות (il-32.9592-35.2621) | flat | synagogue-only | 0 | 0 |
| כיסרא (il-32.9629-35.3021) | flat | mosque-only | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| ג׳ת (il-32.9737-35.2328) | flat | none | 0 | 0 |
| ינוח (il-32.9837-35.2519) | flat | none | 0 | 0 |
| מעיליא (il-33.0281-35.2583) | flat | none | church 1 | church 1 |
| יחיעם (il-32.9967-35.2204) | flat | none | synagogue 1 | synagogue 1 |
| מכמנים (il-32.9061-35.3288) | flat | none | synagogue 1 | synagogue 1 |
| כמון (il-32.9114-35.3613) | flat | none | 0 | 0 |
| ראס אל-עין (il-32.9158-35.3727) | flat | mosque-only | minaret 1 | minaret 1 |
| מורן (il-32.9216-35.3935) | flat | none | 0 | 0 |
| ראמה (il-32.9380-35.3676) | flat | none | synagogue 1 | synagogue 1 |
| עין אל אסד (il-32.9403-35.4010) | flat | none | synagogue 1 | synagogue 1 |
| הר חלוץ (il-32.9507-35.3122) | flat | none | synagogue 1 | synagogue 1 |
| חרשים (il-32.9570-35.3280) | flat | none | synagogue 1 | synagogue 1 |
| בית ג'ן (il-32.9645-35.3781) | flat | none | synagogue 1 | synagogue 1 |
| פקיעין (il-32.9772-35.3340) | flat | mixed | synagogue 2 | synagogue 2 |
| כפר סומיע (il-32.9803-35.3072) | flat | none | synagogue 1 | synagogue 1 |
| ענבר (il-32.9101-35.4226) | flat | none | church 1 | church 1 |
| פרוד (il-32.9333-35.4333) | flat | none | 0 | 0 |
| כפר שמאי (il-32.9574-35.4579) | flat | synagogue-only | 0 | 0 |
| אלמגור (il-32.9139-35.6033) | flat | none | 0 | 0 |
| עמיעד (il-32.9287-35.5416) | flat | none | 0 | 0 |
| טובא זנגריה (il-32.9663-35.5944) | flat | mosque-only | minaret 2, synagogue 1 | minaret 2, synagogue 1 |
| כפר הנשיא (il-32.9749-35.6038) | flat | none | synagogue 1 | synagogue 1 |
| עמוקה (il-32.9980-35.5243) | flat | none | church 1 | church 1 |
| אניעם (il-32.9569-35.7398) | flat | none | 0 | 0 |
| אל-מעלקה (il-32.9171-35.8932) | flat | none | 0 | 0 |
| א-רפיד (il-32.9560-35.9009) | flat | none | 0 | 0 |
| אל-אסבח (il-32.9794-35.8844) | flat | none | 0 | 0 |
| אל בוטיחה (il-32.9364-35.9113) | flat | none | 0 | 0 |
| כברי (il-33.0215-35.1485) | flat | none | 0 | 0 |
| שלומי (il-33.0721-35.1451) | flat | none | 0 | 0 |
| לבונה (il-33.0933-35.1487) | flat | none | 0 | 0 |
| געתון (il-33.0057-35.2137) | flat | none | synagogue 1 | synagogue 1 |
| מצפה הילה (il-33.0358-35.2443) | flat | none | church 1 | church 1 |
| אבירים (il-33.0386-35.2871) | flat | none | church 1 | church 1 |
| גרנות הגליל (il-33.0595-35.2497) | flat | none | church 1 | church 1 |
| אילון (il-33.0633-35.2197) | flat | none | 0 | 0 |
| אדמית (il-33.0796-35.2103) | flat | none | 0 | 0 |
| א-ד'והיירה (il-33.1011-35.2271) | flat | mosque-only | minaret 1 | minaret 1 |
| בסתן (il-33.1010-35.2548) | flat | none | 0 | 0 |
| חורפיש (il-33.0174-35.3470) | flat | none | church 1 | church 1 |
| סאסא (il-33.0269-35.3950) | flat | none | synagogue 1 | synagogue 1 |
| פסוטה (il-33.0484-35.3100) | flat | none | church 1 | church 1 |
| ג'ש (il-33.0244-35.4459) | flat | mosque-only | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| צבעון (il-33.0259-35.4166) | flat | none | minaret 1, synagogue 1 | minaret 1, synagogue 1 |
| ריחאנייה (il-33.0482-35.4873) | flat | mosque-only | church 1, minaret 1 | church 1, minaret 1 |
| דוב״ב (il-33.0525-35.4075) | flat | none | synagogue 1 | synagogue 1 |
| ברעם (il-33.0591-35.4340) | flat | none | 0 | 0 |
| יראון (il-33.0778-35.4558) | flat | none | 0 | 0 |
| איילת השחר (il-33.0216-35.5759) | flat | none | 0 | 0 |
| חולתה (il-33.0511-35.6092) | flat | none | 0 | 0 |
| יסוד המעלה (il-33.0585-35.6079) | flat | none | 0 | 0 |
| מלכיה (il-33.0992-35.5117) | flat | none | 0 | 0 |
| גדות (il-33.0181-35.6189) | flat | none | synagogue 1 | synagogue 1 |
| קדמת צבי (il-33.0297-35.6970) | flat | none | 0 | 0 |
| אורטל (il-33.0852-35.7594) | flat | none | 0 | 0 |
| עין זיוון (il-33.0963-35.7962) | flat | none | 0 | 0 |
| כודנה (il-33.0091-35.8885) | flat | none | 0 | 0 |
| בריקה (il-33.0430-35.8711) | flat | none | 0 | 0 |
| ביר אל-עג'ם (il-33.0531-35.8674) | flat | none | 0 | 0 |
| رويحينة (il-33.0827-35.8715) | flat | none | 0 | 0 |
| מרווחין (il-33.1086-35.2767) | flat | none | 0 | 0 |
| ראמיה (il-33.1111-35.3100) | flat | mosque-only | minaret 1 | minaret 1 |
| יפתח (il-33.1286-35.5519) | flat | none | 0 | 0 |
| נאות מרדכי (il-33.1606-35.5966) | flat | none | 0 | 0 |
| מנרה (il-33.1959-35.5446) | flat | none | 0 | 0 |
| להבות הבשן (il-33.1406-35.6463) | flat | none | 0 | 0 |
| רמת טראמפ (il-33.1326-35.6906) | flat | none | 0 | 0 |
| שמיר (il-33.1639-35.6592) | flat | none | 0 | 0 |
| עמיר (il-33.1788-35.6208) | flat | none | 0 | 0 |
| כפר סאלד (il-33.1947-35.6579) | flat | none | 0 | 0 |
| מרום גולן (il-33.1321-35.7773) | flat | none | 0 | 0 |
| אל-רום (il-33.1797-35.7721) | flat | none | 0 | 0 |
| אודם (il-33.1944-35.7483) | flat | none | 0 | 0 |
| אל-קחטאניה (il-33.1093-35.8378) | flat | none | 0 | 0 |
| Shuli (il-33.1115-35.8496) | flat | none | 0 | 0 |
| Al-Rawadi (il-33.1382-35.8475) | flat | none | 0 | 0 |
| אל-חמידייה (il-33.1563-35.8479) | flat | none | 0 | 0 |
| אל-חרריה (il-33.1897-35.8453) | flat | none | 0 | 0 |
| כפר גלעדי (il-33.2418-35.5750) | flat | none | 0 | 0 |
| אל-עדייסה (il-33.2578-35.5467) | flat | none | 0 | 0 |
| כפר כילא (il-33.2827-35.5588) | flat | none | 0 | 0 |
| משגב עם (il-33.2478-35.5487) | flat | none | 0 | 0 |
| הגושרים (il-33.2211-35.6231) | flat | none | 0 | 0 |
| דפנה (il-33.2304-35.6393) | flat | none | 0 | 0 |
| מעיין ברוך (il-33.2398-35.6079) | flat | none | 0 | 0 |
| דן (il-33.2401-35.6531) | flat | none | 0 | 0 |
| שניר (il-33.2410-35.6782) | flat | church-only | 0 | 0 |
| מייסת (il-33.2627-35.6193) | flat | none | 0 | 0 |
| ערב א-לויזה (il-33.2740-35.6146) | flat | none | minaret 1 | minaret 1 |
| ע'ג'ר (il-33.2722-35.6239) | flat | mosque-only | minaret 1 | minaret 1 |
| מסעדה (il-33.2312-35.7575) | flat | none | 0 | 0 |
| נמרוד (il-33.2452-35.7510) | flat | none | 0 | 0 |
| מג'דל שמס (il-33.2684-35.7694) | flat | none | 0 | 0 |
| נווה אטי"ב (il-33.2620-35.7408) | flat | none | 0 | 0 |
| ג'בתא אל-ח'שב (il-33.2258-35.8341) | flat | none | 0 | 0 |
| שבעא (il-33.3445-35.7494) | flat | none | 0 | 0 |

## Findings

Baseline counts exclude the separately observed production row.

| Group | 375 px | 1280 px | Total |
| --- | ---: | ---: | ---: |
| A | 34 | 36 | 70 |
| B | 309 | 309 | 618 |
| C | 12 | 12 | 24 |
| D | 91 | 91 | 182 |
| All | 446 | 448 | 894 |

- **A.** Seats on a named neighbouring town's drawn block outside the own horizontal span. Phase 1 classified these by seating and span. Phase 2 checks angular size.
- **B.** The 618 own rows are synagogues. The own-footprint and portrait path in `src/data/landmarks/placeMarks.ts:85` and `src/world/marks.ts:68` intentionally seats those marks as part of the place.
- **C.** The 24 baseline rows are minarets, including Kiryat Arba's view of Hebron block `315_351:5:15` at 1.25 km. The seating path in `src/world/beyondSeat.ts:127` and the final layout in `src/scene/model/outsideMarks.ts:14` checked block containment without checking for roofs in front of the glyph foot.
- **D.** The 182 rows include 180 far-plane glyphs without blocks and Ofer's unseated near-plane synagogue at both widths. The far path in `src/data/landmarks/placeMarks.ts:112` and `src/world/marks.ts:79` used schematic glyph sizing, and the ordinary near path in `src/scene/model/outsideMarks.ts:17` accepted unseated marks. At Shvei Darom, the 9 m Ibn Othman Mosque hall in Gaza drew at 8 px from 16.24 km away.

Across all places the saved probe counted 2,876 worship glyph rows and matched every drawn glyph to a source. Synagogue-only places account for 894 rows, including 204 non-synagogue rows.

## After

Round 6, owner decision **"מסגדים לא, ציונים כן"**. Background offline audit of 1,781 places
(18 recorded, 1,763 flat 100 m), both 375/1280 px, 686.45 s.
Non-own kept rows: 694 → 1957; 1271 famous; 1235 ridge-based.
Forbidden non-own mosque or non-famous worship glyphs: **0**. All emitted neighbours passed independent geometry,
height/factor and true-distance haze checks. Own worship rows 1662 → 1662; additions/removals 0/0; changed common x/height geometry: 0.

| Final-receiver reason | Rows |
| --- | --- |
| budget-or-glyph-occlusion | 1 |
| home-haze | 1015 |
| kept | 1957 |
| missing-town-mass | 1442 |
| no-visible-separated-position | 1497 |

The receiver denominator starts at world-layout candidates; policy/pre-selection drops happen before it.
It is not a raw-source recall percentage. Full final neighbour measurements: [ROUND6-neighbours.tsv](ROUND6-neighbours.tsv).
Historical tables below retain their original round labels; current source exports are `audit-after.json` and
`neighbours-after.json` in `src/test/probe-worship/`.

| Set | Width | Layer | Before R6: all / non-own | After R6: all / non-own |
| --- | --- | --- | --- | --- |
| 18 recorded | 375 | outside | 37 / 0 | 37 / 0 |
| 18 recorded | 375 | marks.far | 0 / 0 | 0 / 0 |
| 18 recorded | 1280 | outside | 37 / 0 | 37 / 0 |
| 18 recorded | 1280 | marks.far | 0 / 0 | 0 / 0 |
| 117 total | 375 | outside | 176 / 18 | 180 / 22 |
| 117 total | 375 | marks.far | 0 / 0 | 58 / 58 |
| 117 total | 1280 | outside | 177 / 19 | 181 / 23 |
| 117 total | 1280 | marks.far | 0 / 0 | 57 / 57 |

See `REPORT.md` Round 6 for famous landmark outcomes and mutation evidence.

## After — round 5 (historical)

Round 5: 1,781 places, both widths, 421.50 s in the probe.
694 kept neighbour rows, 2826 culled final-receiver candidates.
As in R4, this denominator starts at world-layout candidates offered to the scene, excluding earlier
source/terrain/pre-selection rejects. The new derived pre-selection floor removes doomed candidates earlier;
receiver-pool totals are therefore not directly comparable as raw-source recall percentages.

| Final-receiver reason | Rows |
| --- | --- |
| budget-or-glyph-occlusion | 2 |
| home-haze | 705 |
| kept | 694 |
| missing-town-mass | 932 |
| no-visible-separated-position | 1187 |

| Kept factor range | Rows |
| --- | --- |
| 1 | 268 |
| (1,1.25] | 110 |
| (1.25,1.5] | 125 |
| (1.5,1.75] | 113 |
| (1.75,2] | 78 |

| Set | Layer | Before R5: all / non-own | After R5: all / non-own |
| --- | --- | --- | --- |
| 18 recorded | outside | 74 / 0 | 74 / 0 |
| 18 recorded | marks.far | 0 / 0 | 0 / 0 |
| 117 total | outside | 355 / 39 | 353 / 37 |
| 117 total | marks.far | 0 / 0 | 0 / 0 |

See REPORT.md Round 5 for every named far landmark's before → after reason and the full file inventory.
Current per-glyph evidence is in `neighbours-after.json`; the R5 TSV section contains every kept row.

## After — round 4 (historical)

Round 4, Decision B. The completed offline audit covers 1,781 places at both widths:
18 recorded panoramas and 1,763 explicitly flat 100 m fixtures.
It took 371.16 s in the probe. It matched every worship glyph and checked
18 seated neighbours, 620 unseated neighbours and
7,366 raster towers. There are 1,672 drawn worship rows;
1,662 own worship rows retain the same IDs and drawn geometry as round 3.

These counts use distinct world-layout candidates offered to the final receiver, once per place/width.
They include every glyph kind and every candidate in the unbudgeted seat pool. Raw sources rejected earlier by
shortlisting, terrain projection, or the angular existence floor are outside this denominator. Zero far
candidates reached this final pool; that does **not** mean zero upstream far culls. The historic 117-place
replay below and the complete named-landmark table in REPORT.md expose those removals separately.

| Final receiver layer | Offered candidates | Kept | Culled |
| --- | --- | --- | --- |
| outside | 9156 | 638 | 8518 |
| marks.far | 0 | 0 | 0 |

| Reason | Candidate rows |
| --- | --- |
| budget-or-glyph-occlusion | 2 |
| exaggeration-cap | 6230 |
| home-haze | 582 |
| kept | 638 |
| missing-town-mass | 675 |
| no-visible-separated-position | 1029 |

| Factor range | Kept neighbour rows |
| --- | --- |
| 1 | 233 |
| (1,1.25] | 99 |
| (1.25,1.5] | 118 |
| (1.5,1.75] | 106 |
| (1.75,2] | 82 |

Every kept neighbour is ≥4 CSS px and ≤2× its physical visible height; width uses the same factor.
The minimum drawn-box home gap is 6.000000 px and maximum absolute slide is 11.958529 px.
Town members retain their own painted support and side strips; standalone marks require visible feet.
True-distance far-town haze never becomes lighter than home. The current rows, including factor, distance,
layer, gap, slide and support, are in `src/test/probe-worship/neighbours-after.json` and the Round-4 TSV sections.

### Fixed-set layer comparison

Each row is a glyph at one width: 375 and 1280 are both counted. Non-own classification uses source coordinates
and the same own-footprint predicate for all three stages, independently of newer perspective metadata.

| Set | Layer | Before round 1: all / non-own | After round 3: all / non-own | After round 4: all / non-own |
| --- | --- | --- | --- | --- |
| 18 recorded | outside | 88 / 14 | 74 / 0 | 74 / 0 |
| 18 recorded | marks.far | 2 / 2 | 0 / 0 | 0 / 0 |
| 117 total | outside | 640 / 324 | 343 / 27 | 355 / 39 |
| 117 total | marks.far | 234 / 234 | 0 / 0 | 0 / 0 |

Before R1 uses the base HEAD production sources; R3 uses the saved production snapshot at the start of this round.
Both are replayed read-only through a Vitest pre-transform, without changing the worktree. The same 117 places,
bundled data and recorded/flat fixtures are used throughout. `round4-layers-*.json` preserves each row.
The historical round-3 tables below remain labelled for comparison; they are not the current kept-neighbour list.

## After — round 3 (historical)

This is the final round-3 comparison. Paired counts cover the original 1,780 places at both widths. The separate production Karmei Tzur point adds its own synagogue at each width, giving 1,903 worship rows across all 1,781 places. Its supplied baseline records the Halhul minaret at 375 px. Its production panorama is unavailable locally: subsequent audit worlds use flat 100 m terrain and the observed 17 m tower height, while a separate regression reconstructs the measured foreground geometry.

The full offline audit passed in 503.5 s (508.41 s including Vitest startup), with 18 recorded panoramas and 1,763 flat 100 m fixtures. Every worship glyph matched its source. It checked 242 seated glyphs of every kind, no retained unseated non-owned glyphs, and 7,366 raster towers. Unsupported far glyphs cannot establish their own town in the coarse far field and are culled. Own skyline composition is preserved.

The owner rule requires 6 CSS px from the whole final home roofline span, 1 CSS px of source-square town mass at both sides of the whole glyph footprint, and visible support at the foot. Search stays within that proven source square, away from home, by at most 12 CSS px. The nearest feasible position comes from the exact interval boundaries of the home gap, source mass, text, viewport and foot occluders, including ridge intersections; a 1e-7 px epsilon only resolves floating-point contact. Haze equals the town's tier and is no less than any home roof's haze. Heights use the true base-angle projection, with one shared 1 CSS px floor. Only physically hidden terrain portions are clipped.

| Measure | Phase 1 | Round 1 | Round 2 | Round 3 |
| --- | --- | --- | --- | --- |
| All drawn worship rows | 2876 | 1906 | 2177 | 1901 |
| Synagogue-only worship rows | 894 | 686 | 756 | 684 |
| Synagogue-only non-synagogue worship rows | 204 | 32 | 52 | 37 |
| A · Named neighbouring seat outside own span | 70 | 66 | 134 | 64 |
| B · Own | 618 | 618 | 618 | 618 |
| C · Beyond seat overlapping own x span | 24 | 0 | 0 | 0 |
| D · Remaining | 182 | 2 | 4 | 2 |

Round 2 → round 3 adds 23 worship rows through backfill and removes 299, a net reduction of 276. Own worship rows stay unchanged. The 37 non-synagogue worship rows on synagogue-only places are neighbouring minarets (17 phone, 20 desktop), all outside the home span. The two remaining D rows have unnamed supporting built clusters. Group C remains zero. The detailed kept-neighbour list includes a separate high-rise, which is not a worship row and does not enter the A–D worship counts.

### Kept neighbour glyphs, all kinds

There are 242 rows: 241 worship glyphs and one high-rise. An offline replay checked all 47 places within reach of the 42 high-rise/home sources without a replacing tower in their own cell, using the production replacement predicate. Its combined count exactly matches the exhaustive audit's 242 checked neighbours. Each row is an actual final-scene glyph with its source-square ownership proof. The minimum home gap is 6.000000 px. Fifty rows slide, with a maximum magnitude of 11.574090 px. Positive slides move right and negative slides move left, always away from home. Positions are exact feasible boundaries, with at most 1e-7 px for floating-point contact. Measurements are CSS px before DPR multiplication.

| Home place | Width px | Kept neighbour glyph | Supporting town / source square | Home gap px | Slide px |
| --- | --- | --- | --- | --- | --- |
| אל-מוסדר (il-31.4150-34.3764) | 1280 | minaret [il-minaret-31.41409-34.34441] | דיר אל-בלאח [314_343:35:6] | 283.799903 | 0.000000 |
| בית עמרה (il-31.4502-35.0482) | 375 | minaret [il-minaret-31.44663-35.07342] | יטא [314_350:58:22] | 55.667082 | 0.000000 |
| בית עמרה (il-31.4502-35.0482) | 1280 | minaret [il-minaret-31.44663-35.07342] | יטא [314_350:58:22] | 191.216677 | 0.000000 |
| Al Tabaqa (il-31.4904-35.0215) | 375 | minaret [il-minaret-31.47985-35.05615] | האדאב אל פאוואר [314_350:44:38] | 103.400262 | 0.000000 |
| Al Tabaqa (il-31.4904-35.0215) | 1280 | minaret [il-minaret-31.47563-35.05359] | האדאב אל פאוואר [314_350:42:36] | 258.576624 | 0.000000 |
| Al Tabaqa (il-31.4904-35.0215) | 1280 | minaret [il-minaret-31.47985-35.05615] | האדאב אל פאוואר [314_350:44:38] | 354.057731 | 0.000000 |
| בית חגי (il-31.4934-35.0804) | 1280 | minaret [il-minaret-31.47742-35.06553] | אל פאוור [314_350:52:37] | 6.000000 | 1.172420 |
| בית חגי (il-31.4934-35.0804) | 1280 | minaret [il-minaret-31.48017-35.0603] | אל פאוור [314_350:48:38] | 80.453689 | 0.000000 |
| בית הברכה (il-31.6319-35.1316) | 375 | minaret [il-minaret-31.62762-35.15748] | בית פג'אר [316_351:45:13] | 63.827415 | 0.000000 |
| בית הברכה (il-31.6319-35.1316) | 1280 | minaret [il-minaret-31.62762-35.15748] | בית פג'אר [316_351:45:13] | 219.083552 | 0.000000 |
| מגדל עוז (il-31.6397-35.1425) | 1280 | minaret [il-minaret-31.62762-35.15748] | בית פג'אר [316_351:45:13] | 25.279107 | 0.000000 |
| ضاحية الزيتون - الصوانة (il-31.6429-35.0478) | 1280 | minaret [il-minaret-31.64861-35.06499] | סוריף [316_350:51:23] | no home roofs | 0.000000 |
| כפר עציון (il-31.6487-35.1150) | 375 | synagogue [il-synagogue-31.64659-35.14331] | אפרת [316_351:34:22] | 81.019324 | 0.000000 |
| כפר עציון (il-31.6487-35.1150) | 1280 | synagogue [il-synagogue-31.64659-35.14331] | אפרת [316_351:34:22] | 278.140554 | 0.000000 |
| בת עין (il-31.6573-35.1032) | 375 | synagogue [il-synagogue-31.65729-35.12548] | אלון שבות [316_351:20:27] | 14.747909 | -0.026091 |
| בת עין (il-31.6573-35.1032) | 1280 | synagogue [il-synagogue-31.65729-35.12548] | אלון שבות [316_351:20:27] | 52.031015 | 0.000000 |
| אלעזר (il-31.6607-35.1415) | 375 | minaret [il-minaret-31.65388-35.16033] | ואדי א-ניס [316_351:48:25] | 41.257034 | 0.000000 |
| אלעזר (il-31.6607-35.1415) | 375 | synagogue [il-synagogue-31.65685-35.15055] | אפרת [316_351:40:27] | 9.972311 | -0.218845 |
| אלעזר (il-31.6607-35.1415) | 375 | synagogue [il-synagogue-31.65729-35.12548] | אלון שבות [316_351:20:27] | 17.801865 | 0.000000 |
| אלעזר (il-31.6607-35.1415) | 1280 | minaret [il-minaret-31.65388-35.16033] | ואדי א-ניס [316_351:48:25] | 142.055976 | 0.000000 |
| אלעזר (il-31.6607-35.1415) | 1280 | synagogue [il-synagogue-31.65685-35.15055] | אפרת [316_351:40:27] | 35.341091 | 0.000000 |
| אלעזר (il-31.6607-35.1415) | 1280 | synagogue [il-synagogue-31.65729-35.12548] | אלון שבות [316_351:20:27] | 62.714634 | 0.000000 |
| ואדי רחאל (il-31.6673-35.1704) | 375 | synagogue [il-synagogue-31.66026-35.15226] | אפרת [316_351:41:28] | 14.846128 | 0.000000 |
| ואדי רחאל (il-31.6673-35.1704) | 1280 | synagogue [il-synagogue-31.66026-35.15226] | אפרת [316_351:41:28] | 52.285638 | 0.000000 |
| ראש צורים (il-31.6676-35.1253) | 375 | synagogue [il-synagogue-31.66968-35.16324] | אפרת [316_351:50:33] | 166.236160 | 0.000000 |
| ראש צורים (il-31.6676-35.1253) | 1280 | synagogue [il-synagogue-31.64659-35.14331] | אפרת [316_351:34:22] | 65.090487 | 0.000000 |
| ראש צורים (il-31.6676-35.1253) | 1280 | synagogue [il-synagogue-31.66968-35.16324] | אפרת [316_351:50:33] | 569.204273 | 0.000000 |
| נווה דניאל (il-31.6762-35.1428) | 375 | synagogue [il-synagogue-31.66968-35.16324] | אפרת [316_351:50:33] | 18.931226 | 0.000000 |
| נווה דניאל (il-31.6762-35.1428) | 1280 | synagogue [il-synagogue-31.66968-35.16324] | אפרת [316_351:50:33] | 66.259302 | 0.000000 |
| שדה בועז (il-31.6937-35.1479) | 1280 | synagogue [il-synagogue-31.66968-35.16324] | אפרת [316_351:50:33] | 100.915959 | 0.000000 |
| חוסאן (il-31.7080-35.1356) | 375 | synagogue [il-synagogue-31.70175-35.10747] | ביתר עילית [317_351:5:0] | 52.040360 | 0.000000 |
| חוסאן (il-31.7080-35.1356) | 1280 | synagogue [il-synagogue-31.70175-35.10747] | ביתר עילית [317_351:5:0] | 179.052646 | 0.000000 |
| דאר סלאח (il-31.7086-35.2648) | 1280 | minaret [il-minaret-31.70386-35.2336] | בית סאחור [317_352:26:1] | 202.884554 | 1.724608 |
| חוות נווה אורי הישנה (il-31.7120-35.1647) | 375 | minaret [il-minaret-31.70696-35.19586] | ירושלים [317_351:76:3] | no home roofs | -1.134197 |
| חוות נווה אורי הישנה (il-31.7120-35.1647) | 1280 | minaret [il-minaret-31.70696-35.19586] | ירושלים [317_351:76:3] | no home roofs | -0.166438 |
| אל-נועמן (il-31.7148-35.2495) | 375 | minaret [il-minaret-31.70459-35.25571] | ירושלים [317_352:44:2] | 8.045657 | 0.000000 |
| אל-נועמן (il-31.7148-35.2495) | 1280 | minaret [il-minaret-31.70459-35.25571] | ירושלים [317_352:44:2] | 29.085992 | 0.000000 |
| בית ג'אלה (il-31.7155-35.1874) | 1280 | minaret [il-minaret-31.70353-35.16172] | אל-ח'דר [317_351:49:1] | 56.473432 | 0.000000 |
| צור הדסה (il-31.7157-35.0948) | 1280 | synagogue [il-synagogue-31.70376-35.11433] | ביתר עילית [317_351:11:1] | 21.098663 | 0.000000 |
| ביר עונה (il-31.7204-35.1901) | 375 | minaret [il-minaret-31.72006-35.1991] | ח'לת חמאמה [317_351:79:9] | 43.303717 | 0.000000 |
| ביר עונה (il-31.7204-35.1901) | 1280 | minaret [il-minaret-31.72006-35.1991] | ח'לת חמאמה [317_351:79:9] | 150.191580 | 0.000000 |
| ח'לת חמאמה (il-31.7205-35.1948) | 375 | minaret [il-minaret-31.72006-35.1991] | ח'לת חמאמה [317_351:79:9] | 6.000000 | -1.744281 |
| ח'לת חמאמה (il-31.7205-35.1948) | 1280 | minaret [il-minaret-31.72006-35.1991] | ח'לת חמאמה [317_351:79:9] | 17.058920 | 0.000000 |
| מבוא ביתר (il-31.7227-35.1071) | 375 | minaret [il-minaret-31.72755-35.13614] | בתיר [317_351:28:13] | 147.741925 | -0.525552 |
| מבוא ביתר (il-31.7227-35.1071) | 1280 | minaret [il-minaret-31.72755-35.13614] | בתיר [317_351:28:13] | 503.989515 | 0.000000 |
| חוות צאן קידר (il-31.7366-35.3195) | 375 | minaret [il-minaret-31.72468-35.28968] | ירושלים [317_352:71:11] | no home roofs | -0.401911 |
| חוות צאן קידר (il-31.7366-35.3195) | 1280 | minaret [il-minaret-31.72468-35.28968] | ירושלים [317_352:71:11] | no home roofs | 0.000000 |
| א-שייח' סעד (il-31.7373-35.2568) | 375 | minaret [il-minaret-31.71248-35.27266] | אל-עובידיה [317_352:58:5] | 16.084574 | 0.000000 |
| א-שייח' סעד (il-31.7373-35.2568) | 375 | minaret [il-minaret-31.71792-35.27436] | אל-עובידיה [317_352:59:8] | 28.146040 | 0.000000 |
| א-שייח' סעד (il-31.7373-35.2568) | 1280 | minaret [il-minaret-31.71248-35.27266] | אל-עובידיה [317_352:58:5] | 55.903967 | 0.000000 |
| א-שייח' סעד (il-31.7373-35.2568) | 1280 | minaret [il-minaret-31.71792-35.27436] | אל-עובידיה [317_352:59:8] | 97.188875 | 0.000000 |
| א-סואחרה א-שרקיה (il-31.7433-35.2697) | 1280 | minaret [il-minaret-31.73627-35.2382] | ירושלים [317_352:30:17] | 225.337793 | 0.000000 |
| א-סואחרה א-שרקיה (il-31.7433-35.2697) | 1280 | minaret [il-minaret-31.7419-35.28064] | ירושלים [317_352:64:20] | 6.000000 | -10.320511 |
| אל-עיזריה (il-31.7732-35.2596) | 375 | minaret [il-minaret-31.76768-35.28197] | ערב אל ג'האלין [317_352:65:32] | 57.197196 | 0.000000 |
| אל-עיזריה (il-31.7732-35.2596) | 1280 | minaret [il-minaret-31.76768-35.28197] | ערב אל ג'האלין [317_352:65:32] | 196.757775 | 0.000000 |
| בית ספר חקלאי עין כרם (il-31.7788-35.1532) | 1280 | church [il-church-31.76446-35.15783] | ירושלים [317_351:46:30] | 15.600968 | 0.000000 |
| א-זעיים (il-31.7873-35.2663) | 375 | minaret [il-minaret-31.76768-35.28197] | ערב אל ג'האלין [317_352:65:32] | 12.590071 | 0.000000 |
| א-זעיים (il-31.7873-35.2663) | 1280 | minaret [il-minaret-31.76768-35.28197] | ערב אל ג'האלין [317_352:65:32] | 44.085026 | 0.000000 |
| מוצא עילית (il-31.7935-35.1566) | 375 | synagogue [il-synagogue-31.79065-35.19147] | ירושלים [317_351:73:43] | 117.117440 | -0.489163 |
| מוצא עילית (il-31.7935-35.1566) | 1280 | synagogue [il-synagogue-31.79065-35.19147] | ירושלים [317_351:73:43] | 399.871261 | 0.000000 |
| קרית יערים (il-31.8035-35.1013) | 375 | minaret [il-minaret-31.80386-35.11386] | אבו גוש [318_351:11:1] | 32.103717 | 0.000000 |
| קרית יערים (il-31.8035-35.1013) | 1280 | minaret [il-minaret-31.80386-35.11386] | אבו גוש [318_351:11:1] | 111.547772 | 0.000000 |
| יד השמונה (il-31.8095-35.0902) | 375 | synagogue [il-synagogue-31.8047-35.1043] | קרית יערים [318_351:3:2] | 56.392126 | -0.384791 |
| יד השמונה (il-31.8095-35.0902) | 1280 | synagogue [il-synagogue-31.8047-35.1043] | קרית יערים [318_351:3:2] | 193.438290 | 0.000000 |
| בית סוריכ (il-31.8230-35.1496) | 1280 | synagogue [il-synagogue-31.80823-35.16537] | מבשרת ציון [318_351:52:3] | 40.207617 | 0.000000 |
| בית חנינא אל-בלד (il-31.8310-35.2057) | 375 | synagogue [il-synagogue-31.81904-35.18761] | ירושלים [318_351:70:9] | 42.340624 | 0.000000 |
| בית חנינא אל-בלד (il-31.8310-35.2057) | 375 | synagogue [il-synagogue-31.82196-35.19443] | ירושלים [318_351:75:10] | 23.038890 | 0.000000 |
| בית חנינא אל-בלד (il-31.8310-35.2057) | 1280 | synagogue [il-synagogue-31.81904-35.18761] | ירושלים [318_351:70:9] | 146.280564 | 0.000000 |
| בית חנינא אל-בלד (il-31.8310-35.2057) | 1280 | synagogue [il-synagogue-31.82196-35.19443] | ירושלים [318_351:75:10] | 80.669310 | 0.000000 |
| נבי סמואל - כפר (il-31.8338-35.1840) | 375 | synagogue [il-synagogue-31.82473-35.19254] | ירושלים [318_351:74:11] | 21.929534 | -0.749987 |
| נבי סמואל - כפר (il-31.8338-35.1840) | 1280 | synagogue [il-synagogue-31.82196-35.19443] | ירושלים [318_351:75:10] | 90.362037 | -2.409043 |
| נבי סמואל - כפר (il-31.8338-35.1840) | 1280 | synagogue [il-synagogue-31.82473-35.19254] | ירושלים [318_351:74:11] | 74.635802 | 0.000000 |
| א-נבי סימואיל בדואים (il-31.8359-35.1868) | 375 | synagogue [il-synagogue-31.81638-35.20685] | ירושלים [318_352:5:7] | no home roofs | 0.938488 |
| א-נבי סימואיל בדואים (il-31.8359-35.1868) | 1280 | synagogue [il-synagogue-31.81638-35.20685] | ירושלים [318_352:5:7] | no home roofs | 0.000000 |
| א-נבי סימואיל בדואים (il-31.8359-35.1868) | 1280 | synagogue [il-synagogue-31.82196-35.19443] | ירושלים [318_351:75:10] | no home roofs | 0.000000 |
| גני יוחנן (il-31.8603-34.8407) | 375 | synagogue [il-synagogue-31.85692-34.82309] | קרית עקרון [318_348:18:27] | 26.882835 | 0.817494 |
| גני יוחנן (il-31.8603-34.8407) | 1280 | synagogue [il-synagogue-31.85568-34.82702] | קרית עקרון [318_348:21:26] | 34.667183 | 0.000000 |
| גני יוחנן (il-31.8603-34.8407) | 1280 | synagogue [il-synagogue-31.85692-34.82309] | קרית עקרון [318_348:18:27] | 91.474358 | 0.000000 |
| קרית עקרון (il-31.8608-34.8233) | 1280 | synagogue [il-synagogue-31.85517-34.84083] | מזכרת בתיה [318_348:32:26] | 87.674897 | 0.000000 |
| אל-טירה (il-31.8693-35.1234) | 375 | synagogue [il-synagogue-31.86547-35.15081] | ירושלים [318_351:40:31] | 24.011946 | 0.000000 |
| אל-טירה (il-31.8693-35.1234) | 1280 | synagogue [il-synagogue-31.86547-35.15081] | ירושלים [318_351:40:31] | 83.994147 | 0.000000 |
| מגרון (il-31.8742-35.2591) | 375 | minaret [il-minaret-31.86765-35.22712] | מ.פ. קלנדיה [318_352:21:32] | 134.383864 | 0.298022 |
| מגרון (il-31.8742-35.2591) | 1280 | minaret [il-minaret-31.86765-35.22712] | מ.פ. קלנדיה [318_352:21:32] | 448.376004 | 0.000000 |
| בית חורון (il-31.8782-35.1268) | 375 | synagogue [il-synagogue-31.86547-35.15081] | ירושלים [318_351:40:31] | 47.894636 | 0.000000 |
| בית חורון (il-31.8782-35.1268) | 1280 | synagogue [il-synagogue-31.86547-35.15081] | ירושלים [318_351:40:31] | 165.239842 | 0.000000 |
| מעלה מכמש (il-31.8789-35.3062) | 375 | minaret [il-minaret-31.87214-35.27728] | מחמאס [318_352:61:34] | 104.989069 | 0.000000 |
| מעלה מכמש (il-31.8789-35.3062) | 1280 | minaret [il-minaret-31.87214-35.27728] | מחמאס [318_352:61:34] | 359.646895 | 0.000000 |
| תל ציון (il-31.8796-35.2382) | 1280 | minaret [il-minaret-31.88379-35.20008] | אל בירה [318_352:0:40] | 233.894536 | 9.302460 |
| כוכב יעקב (il-31.8814-35.2453) | 375 | minaret [il-minaret-31.86765-35.22712] | מ.פ. קלנדיה [318_352:21:32] | 28.539559 | 0.174243 |
| כוכב יעקב (il-31.8814-35.2453) | 375 | minaret [il-minaret-31.87096-35.2277] | מ.פ. קלנדיה [318_352:22:34] | 33.888048 | 0.000000 |
| כוכב יעקב (il-31.8814-35.2453) | 1280 | minaret [il-minaret-31.86765-35.22712] | מ.פ. קלנדיה [318_352:21:32] | 98.085199 | 0.000000 |
| כוכב יעקב (il-31.8814-35.2453) | 1280 | minaret [il-minaret-31.87096-35.2277] | מ.פ. קלנדיה [318_352:22:34] | 117.059809 | 0.000000 |
| כפר רות (il-31.9108-35.0358) | 1280 | synagogue [il-synagogue-31.89741-35.01455] | מודיעין-מכבים-רעות [318_350:11:46] | 89.200336 | 0.000000 |
| עיינות (il-31.9159-34.7678) | 375 | synagogue [il-synagogue-31.91386-34.78816] | רחובות [319_347:70:6] | 48.844322 | 0.000000 |
| עיינות (il-31.9159-34.7678) | 1280 | synagogue [il-synagogue-31.91386-34.78816] | רחובות [319_347:70:6] | 168.496568 | 0.000000 |
| לפיד (il-31.9175-35.0319) | 1280 | synagogue [il-synagogue-31.89741-35.01455] | מודיעין-מכבים-רעות [318_350:11:46] | 9.967054 | 0.000000 |
| בית עובד (il-31.9213-34.7738) | 1280 | synagogue [il-synagogue-31.91386-34.78816] | רחובות [319_347:70:6] | 10.641327 | 0.000000 |
| מתתיהו (il-31.9298-35.0346) | 375 | synagogue [il-synagogue-31.92948-35.02155] | חשמונאים [319_350:17:14] | 45.245670 | 1.570749 |
| מתתיהו (il-31.9298-35.0346) | 375 | synagogue [il-synagogue-31.93044-35.01592] | גני מודיעין [319_350:12:14] | 87.296287 | 0.000000 |
| מתתיהו (il-31.9298-35.0346) | 1280 | synagogue [il-synagogue-31.92948-35.02155] | חשמונאים [319_350:17:14] | 152.155163 | 0.000000 |
| מתתיהו (il-31.9298-35.0346) | 1280 | synagogue [il-synagogue-31.93044-35.01592] | גני מודיעין [319_350:12:14] | 300.751815 | 0.000000 |
| טלמון (il-31.9394-35.1323) | 375 | minaret [il-minaret-31.93823-35.16806] | unnamed built cluster [319_351:54:18] | 84.277777 | -0.684936 |
| טלמון (il-31.9394-35.1323) | 1280 | minaret [il-minaret-31.93823-35.16806] | unnamed built cluster [319_351:54:18] | 286.390108 | 0.000000 |
| דהמש (il-31.9437-34.8671) | 1280 | synagogue [il-synagogue-31.94247-34.87552] | לוד [319_348:60:20] | 16.540425 | -9.072168 |
| דהמש (il-31.9437-34.8671) | 1280 | synagogue [il-synagogue-31.94454-34.88611] | לוד [319_348:68:21] | 230.329162 | 0.000000 |
| נעלין (il-31.9456-35.0222) | 375 | synagogue [il-synagogue-31.94115-35.04169] | מודיעין עילית [319_350:33:19] | 11.208953 | 0.000000 |
| נעלין (il-31.9456-35.0222) | 1280 | synagogue [il-synagogue-31.94115-35.04169] | מודיעין עילית [319_350:33:19] | 39.678194 | 0.000000 |
| ח'ירבת בני חארת (il-31.9465-35.0724) | 375 | minaret [il-minaret-31.94902-35.04479] | דיר קדיס [319_350:35:23] | 121.548238 | 0.000000 |
| ח'ירבת בני חארת (il-31.9465-35.0724) | 1280 | minaret [il-minaret-31.94902-35.04479] | דיר קדיס [319_350:35:23] | 416.412506 | 0.000000 |
| ניר צבי (il-31.9514-34.8610) | 1280 | synagogue [il-synagogue-31.95194-34.88629] | לוד [319_348:69:24] | 146.745076 | 0.000000 |
| מ.פ. ג'לזון (il-31.9515-35.2116) | 375 | minaret [il-minaret-31.95541-35.24435] | עין יברוד [319_352:35:26] | 131.856637 | 0.000000 |
| מ.פ. ג'לזון (il-31.9515-35.2116) | 1280 | minaret [il-minaret-31.95541-35.24435] | עין יברוד [319_352:35:26] | 451.285336 | 0.000000 |
| מ.פ. ג'לזון (il-31.9515-35.2116) | 1280 | synagogue [il-synagogue-31.94728-35.22321] | בית אל [319_352:18:22] | 45.569085 | 0.000000 |
| מצפה כרמים (il-31.9575-35.3569) | 375 | synagogue [il-synagogue-31.95849-35.35197] | כוכב השחר [319_353:41:28] | no home roofs | 0.647953 |
| מצפה כרמים (il-31.9575-35.3569) | 1280 | synagogue [il-synagogue-31.95849-35.35197] | כוכב השחר [319_353:41:28] | 124.429945 | 0.000000 |
| דורא אל-קרע (il-31.9591-35.2293) | 375 | minaret [il-minaret-31.95314-35.25185] | עין יברוד [319_352:41:25] | 76.011998 | 0.000000 |
| דורא אל-קרע (il-31.9591-35.2293) | 375 | minaret [il-minaret-31.95541-35.24435] | עין יברוד [319_352:35:26] | 47.777909 | 0.000000 |
| דורא אל-קרע (il-31.9591-35.2293) | 1280 | minaret [il-minaret-31.95314-35.25185] | עין יברוד [319_352:41:25] | 260.841791 | 0.000000 |
| דורא אל-קרע (il-31.9591-35.2293) | 1280 | minaret [il-minaret-31.95541-35.24435] | עין יברוד [319_352:35:26] | 164.736476 | 0.000000 |
| ג'יפנא (il-31.9624-35.2163) | 375 | minaret [il-minaret-31.95314-35.25185] | עין יברוד [319_352:41:25] | 88.360723 | 0.000000 |
| ג'יפנא (il-31.9624-35.2163) | 375 | minaret [il-minaret-31.95541-35.24435] | עין יברוד [319_352:35:26] | 70.957565 | 0.000000 |
| ג'יפנא (il-31.9624-35.2163) | 1280 | minaret [il-minaret-31.95314-35.25185] | עין יברוד [319_352:41:25] | 302.640964 | 0.000000 |
| ג'יפנא (il-31.9624-35.2163) | 1280 | minaret [il-minaret-31.95541-35.24435] | עין יברוד [319_352:35:26] | 243.400760 | 0.000000 |
| עג'ול (il-32.0225-35.1796) | 375 | minaret [il-minaret-32.0344-35.1479] | דיר א-סודאן [320_351:38:16] | 93.752554 | 0.000000 |
| עג'ול (il-32.0225-35.1796) | 1280 | minaret [il-minaret-32.0344-35.1479] | דיר א-סודאן [320_351:38:16] | 321.351421 | 0.000000 |
| יהוד מונוסון (il-32.0332-34.8907) | 1280 | synagogue [il-synagogue-32.03618-34.85517] | אור יהודה [320_348:44:17] | 226.405664 | 0.000000 |
| נופך (il-32.0436-34.9207) | 1280 | synagogue [il-synagogue-32.03815-34.895] | יהוד מונוסון [320_348:76:18] | 179.866428 | 0.000000 |
| נחלים (il-32.0590-34.9136) | 1280 | highrise [il-highrise-32.02962-34.86263] | אור יהודה [320_348:50:14] | 268.871412 | 0.000000 |
| אחיה (il-32.0608-35.3276) | 375 | synagogue [il-synagogue-32.05331-35.29996] | שילה [320_352:79:25] | 101.552338 | 0.648079 |
| אחיה (il-32.0608-35.3276) | 1280 | synagogue [il-synagogue-32.05331-35.29996] | שילה [320_352:79:25] | 346.293205 | 0.000000 |
| נווה שיר (il-32.0669-35.2534) | 375 | synagogue [il-synagogue-32.05434-35.23921] | מעלה לבונה [320_352:31:26] | 34.682973 | 0.354673 |
| נווה שיר (il-32.0669-35.2534) | 1280 | synagogue [il-synagogue-32.05434-35.23921] | מעלה לבונה [320_352:31:26] | 119.158877 | 0.000000 |
| עלי זהב (il-32.0711-35.0633) | 1280 | synagogue [il-synagogue-32.06977-35.05449] | לשם [320_350:43:33] | 6.000000 | 4.380204 |
| נאות אילן (il-32.0732-35.2668) | 375 | minaret [il-minaret-32.07151-35.29369] | קריות [320_352:74:34] | 127.093717 | 0.000000 |
| נאות אילן (il-32.0732-35.2668) | 1280 | minaret [il-minaret-32.07151-35.29369] | קריות [320_352:74:34] | 435.347025 | 0.000000 |
| נוף הרים (il-32.0759-35.2775) | 375 | minaret [il-minaret-32.07151-35.29369] | קריות [320_352:74:34] | 70.673119 | 0.000000 |
| נוף הרים (il-32.0759-35.2775) | 1280 | minaret [il-minaret-32.07151-35.29369] | קריות [320_352:74:34] | 243.001296 | 0.000000 |
| נווה שהם (il-32.0776-35.2732) | 375 | minaret [il-minaret-32.07151-35.29369] | קריות [320_352:74:34] | 86.303999 | 0.000000 |
| נווה שהם (il-32.0776-35.2732) | 1280 | minaret [il-minaret-32.07151-35.29369] | קריות [320_352:74:34] | 296.145225 | 0.000000 |
| כפר סירקין (il-32.0777-34.9235) | 1280 | synagogue [il-synagogue-32.08068-34.8958] | פתח תקווה [320_348:76:38] | 345.225612 | 0.000000 |
| א-סאוויה (il-32.0846-35.2580) | 375 | minaret [il-minaret-32.07157-35.24342] | unnamed built cluster [320_352:34:34] | 20.869153 | 0.724110 |
| א-סאוויה (il-32.0846-35.2580) | 1280 | minaret [il-minaret-32.07157-35.24342] | unnamed built cluster [320_352:34:34] | 69.913766 | 0.000000 |
| פלגי מים (il-32.0880-35.2747) | 375 | minaret [il-minaret-32.07151-35.29369] | קריות [320_352:74:34] | no home roofs | 0.598127 |
| פלגי מים (il-32.0880-35.2747) | 375 | minaret [il-minaret-32.08551-35.29249] | תלפית [320_352:73:41] | no home roofs | 0.000000 |
| פלגי מים (il-32.0880-35.2747) | 1280 | minaret [il-minaret-32.07151-35.29369] | קריות [320_352:74:34] | 185.031289 | 0.000000 |
| פלגי מים (il-32.0880-35.2747) | 1280 | minaret [il-minaret-32.08551-35.29249] | תלפית [320_352:73:41] | 316.965200 | 0.000000 |
| מגדלים (il-32.0899-35.3423) | 375 | minaret [il-minaret-32.09017-35.32512] | קוסרא [320_353:20:43] | 102.249580 | 0.000000 |
| מגדלים (il-32.0899-35.3423) | 1280 | minaret [il-minaret-32.09017-35.32512] | קוסרא [320_353:20:43] | 351.024067 | 0.000000 |
| גבעת השלושה (il-32.0981-34.9211) | 375 | synagogue [il-synagogue-32.0892-34.90714] | פתח תקווה [320_349:5:42] | 20.504721 | 0.000000 |
| גבעת השלושה (il-32.0981-34.9211) | 1280 | synagogue [il-synagogue-32.0892-34.90714] | פתח תקווה [320_349:5:42] | 72.065956 | 0.000000 |
| גבעת השלושה (il-32.0981-34.9211) | 1280 | synagogue [il-synagogue-32.09964-34.94144] | ראש העין [320_349:33:47] | 237.936650 | 0.000000 |
| גיתית (il-32.1015-35.3962) | 375 | minaret [il-minaret-32.08393-35.36424] | מג׳דל בני פאדל [320_353:51:40] | 56.610546 | 0.374496 |
| גיתית (il-32.1015-35.3962) | 1280 | minaret [il-minaret-32.08393-35.36424] | מג׳דל בני פאדל [320_353:51:40] | 192.979642 | 0.000000 |
| ג'וריש (il-32.1019-35.3227) | 1280 | minaret [il-minaret-32.10057-35.28922] | קבלאן [321_352:71:0] | 286.607299 | 0.000000 |
| רחלים (il-32.1028-35.2570) | 375 | minaret [il-minaret-32.1035-35.27784] | קבלאן [321_352:62:1] | 120.374696 | 0.000000 |
| רחלים (il-32.1028-35.2570) | 1280 | minaret [il-minaret-32.1035-35.27784] | קבלאן [321_352:62:1] | 412.754781 | 0.000000 |
| יתמא (il-32.1091-35.2693) | 375 | minaret [il-minaret-32.10917-35.23825] | יאסוף [321_352:30:4] | 113.213695 | 0.284243 |
| יתמא (il-32.1091-35.2693) | 1280 | minaret [il-minaret-32.10917-35.23825] | יאסוף [321_352:30:4] | 386.663522 | 0.000000 |
| מרדה (il-32.1143-35.1956) | 375 | minaret [il-minaret-32.10482-35.23336] | יאסוף [321_352:26:2] | 81.744889 | -0.081362 |
| מרדה (il-32.1143-35.1956) | 375 | minaret [il-minaret-32.10917-35.23825] | יאסוף [321_352:30:4] | 119.715441 | 0.000000 |
| מרדה (il-32.1143-35.1956) | 1280 | minaret [il-minaret-32.1038-35.22535] | איסכאכא [321_352:20:1] | 179.761810 | 0.000000 |
| מרדה (il-32.1143-35.1956) | 1280 | minaret [il-minaret-32.10482-35.23336] | יאסוף [321_352:26:2] | 279.746291 | 0.000000 |
| כפר תפוח (il-32.1191-35.2501) | 375 | minaret [il-minaret-32.10482-35.23336] | יאסוף [321_352:26:2] | 41.707757 | 0.880045 |
| כפר תפוח (il-32.1191-35.2501) | 375 | minaret [il-minaret-32.10917-35.23825] | יאסוף [321_352:30:4] | 29.999014 | 0.000000 |
| כפר תפוח (il-32.1191-35.2501) | 1280 | minaret [il-minaret-32.10482-35.23336] | יאסוף [321_352:26:2] | 140.673621 | 0.000000 |
| כפר תפוח (il-32.1191-35.2501) | 1280 | minaret [il-minaret-32.10917-35.23825] | יאסוף [321_352:30:4] | 103.966588 | 0.000000 |
| עץ אפרים (il-32.1192-35.0469) | 1280 | synagogue [il-synagogue-32.10693-35.03447] | אלקנה [321_350:27:3] | 83.471924 | 8.321042 |
| עזבת אל-אשקר (il-32.1405-35.0203) | 1280 | synagogue [il-synagogue-32.13671-34.9893] | אורנית [321_349:71:17] | 489.297640 | 0.000000 |
| עזבת סלמאן (il-32.1432-34.9973) | 375 | synagogue [il-synagogue-32.13671-34.9893] | אורנית [321_349:71:17] | 15.596690 | 0.000000 |
| עזבת סלמאן (il-32.1432-34.9973) | 1280 | synagogue [il-synagogue-32.13671-34.9893] | אורנית [321_349:71:17] | 55.751899 | 0.000000 |
| אל-מודוור (il-32.1433-35.0122) | 1280 | synagogue [il-synagogue-32.13671-34.9893] | אורנית [321_349:71:17] | 196.486184 | 0.000000 |
| ירחיב (il-32.1531-34.9683) | 375 | synagogue [il-synagogue-32.146-34.98618] | נירית [321_349:68:22] | 53.030086 | 0.000000 |
| ירחיב (il-32.1531-34.9683) | 1280 | synagogue [il-synagogue-32.146-34.98618] | נירית [321_349:68:22] | 183.132902 | 0.000000 |
| אודלא (il-32.1554-35.2762) | 1280 | minaret [il-minaret-32.15231-35.25692] | חוארה [321_352:45:25] | 6.000000 | 7.362178 |
| קומי אורי (il-32.1581-35.2368) | 1280 | minaret [il-minaret-32.14923-35.25826] | חוארה [321_352:46:23] | no home roofs | 11.574090 |
| שדי חמד (il-32.1598-34.9436) | 1280 | minaret [il-minaret-32.15574-34.95406] | ג'לג'וליה [321_349:43:26] | 12.946925 | 0.000000 |
| חוות שקד (il-32.1626-35.2406) | 375 | minaret [il-minaret-32.15231-35.25692] | חוארה [321_352:45:25] | no home roofs | -0.830907 |
| חוות שקד (il-32.1626-35.2406) | 1280 | minaret [il-minaret-32.15231-35.25692] | חוארה [321_352:45:25] | no home roofs | 0.000000 |
| רמות השבים (il-32.1662-34.8860) | 375 | synagogue [il-synagogue-32.15892-34.89581] | הוד השרון [321_348:76:28] | 14.924391 | 0.000000 |
| רמות השבים (il-32.1662-34.8860) | 1280 | synagogue [il-synagogue-32.15892-34.89581] | הוד השרון [321_348:76:28] | 52.969068 | 0.000000 |
| רמות השבים (il-32.1662-34.8860) | 1280 | synagogue [il-synagogue-32.16801-34.85935] | הרצליה [321_348:47:32] | 401.215459 | 0.000000 |
| הנקודה (il-32.1680-35.3156) | 375 | minaret [il-minaret-32.16135-35.29311] | עוורתא [321_352:74:29] | 85.617139 | 0.000000 |
| הנקודה (il-32.1680-35.3156) | 375 | minaret [il-minaret-32.16172-35.28711] | עוורתא [321_352:69:29] | 116.342100 | 0.000000 |
| הנקודה (il-32.1680-35.3156) | 1280 | minaret [il-minaret-32.16135-35.29311] | עוורתא [321_352:74:29] | 293.729020 | 0.000000 |
| הנקודה (il-32.1680-35.3156) | 1280 | minaret [il-minaret-32.16172-35.28711] | עוורתא [321_352:69:29] | 398.463420 | 0.000000 |
| גבעת ח"ן (il-32.1686-34.8761) | 375 | synagogue [il-synagogue-32.15892-34.89581] | הוד השרון [321_348:76:28] | 39.827765 | 0.000000 |
| גבעת ח"ן (il-32.1686-34.8761) | 1280 | synagogue [il-synagogue-32.15892-34.89581] | הוד השרון [321_348:76:28] | 137.742340 | 0.000000 |
| שכונת הקראוונים (il-32.1691-35.2393) | 375 | minaret [il-minaret-32.15231-35.25692] | חוארה [321_352:45:25] | 43.533509 | -0.667375 |
| שכונת הקראוונים (il-32.1691-35.2393) | 1280 | minaret [il-minaret-32.15231-35.25692] | חוארה [321_352:45:25] | 147.538742 | 0.000000 |
| עסלה (il-32.1728-35.0341) | 375 | minaret [il-minaret-32.17792-35.05551] | עזון [321_350:44:37] | 98.040537 | -0.872700 |
| עסלה (il-32.1728-35.0341) | 1280 | minaret [il-minaret-32.17792-35.05551] | עזון [321_350:44:37] | 333.740010 | 0.000000 |
| ערב א-רמאד'ין אל-ג'נובי (il-32.1744-34.9896) | 375 | synagogue [il-synagogue-32.17833-35.01277] | אלפי מנשה [321_350:10:37] | 63.830221 | 0.000000 |
| ערב א-רמאד'ין אל-ג'נובי (il-32.1744-34.9896) | 1280 | synagogue [il-synagogue-32.17833-35.01277] | אלפי מנשה [321_350:10:37] | 219.849839 | 0.000000 |
| איתמר (il-32.1745-35.3084) | 375 | minaret [il-minaret-32.16135-35.29311] | עוורתא [321_352:74:29] | 16.481126 | 0.000000 |
| איתמר (il-32.1745-35.3084) | 1280 | minaret [il-minaret-32.16135-35.29311] | עוורתא [321_352:74:29] | 57.602074 | 0.000000 |
| סנה יעקב (il-32.1786-35.2624) | 375 | minaret [il-minaret-32.15777-35.25984] | חוארה [321_352:47:27] | no home roofs | 0.856006 |
| סנה יעקב (il-32.1786-35.2624) | 375 | minaret [il-minaret-32.18386-35.25018] | בורין [321_352:40:40] | no home roofs | 0.000000 |
| סנה יעקב (il-32.1786-35.2624) | 1280 | minaret [il-minaret-32.15777-35.25984] | חוארה [321_352:47:27] | no home roofs | 2.389200 |
| סנה יעקב (il-32.1786-35.2624) | 1280 | minaret [il-minaret-32.18386-35.25018] | בורין [321_352:40:40] | no home roofs | 0.000000 |
| נבי אליאס (il-32.1845-35.0177) | 1280 | minaret [il-minaret-32.17792-35.05551] | עזון [321_350:44:37] | 256.236555 | 0.000000 |
| גן חיים (il-32.1951-34.9055) | 375 | synagogue [il-synagogue-32.18599-34.93616] | כפר סבא [321_349:28:41] | 65.270185 | 0.000000 |
| גן חיים (il-32.1951-34.9055) | 375 | synagogue [il-synagogue-32.18996-34.93738] | כפר סבא [321_349:29:43] | 83.779307 | -0.072130 |
| גן חיים (il-32.1951-34.9055) | 1280 | synagogue [il-synagogue-32.18599-34.93616] | כפר סבא [321_349:28:41] | 224.293467 | 0.000000 |
| גן חיים (il-32.1951-34.9055) | 1280 | synagogue [il-synagogue-32.18996-34.93738] | כפר סבא [321_349:29:43] | 287.314238 | 0.000000 |
| עיראק בורין (il-32.2014-35.2413) | 375 | synagogue [il-synagogue-32.1925-35.26473] | הר ברכה [321_352:51:44] | 74.717199 | 0.000000 |
| עיראק בורין (il-32.2014-35.2413) | 1280 | synagogue [il-synagogue-32.1925-35.26473] | הר ברכה [321_352:51:44] | 256.984019 | 0.000000 |
| מ.פ. עסכר (אל- ג'דיד) (il-32.2146-35.3044) | 375 | minaret [il-minaret-32.21102-35.3245] | סאלם [322_353:19:5] | 36.824610 | 0.000000 |
| מ.פ. עסכר (אל- ג'דיד) (il-32.2146-35.3044) | 1280 | minaret [il-minaret-32.21102-35.3245] | סאלם [322_353:19:5] | 127.035602 | 0.000000 |
| דיר אל-חטב (il-32.2171-35.3219) | 375 | minaret [il-minaret-32.21806-35.28996] | מ.פ. עסכר (אל-קדים) [322_352:71:8] | 113.981447 | 0.000000 |
| דיר אל-חטב (il-32.2171-35.3219) | 1280 | minaret [il-minaret-32.21806-35.28996] | מ.פ. עסכר (אל-קדים) [322_352:71:8] | 390.190156 | 0.000000 |
| ג'וניד (il-32.2254-35.2192) | 375 | minaret [il-minaret-32.21071-35.19023] | סרה [322_351:72:5] | 75.243294 | 0.047972 |
| ג'וניד (il-32.2254-35.2192) | 375 | minaret [il-minaret-32.22028-35.23392] | שכם [322_352:27:9] | 31.695102 | 0.000000 |
| ג'וניד (il-32.2254-35.2192) | 1280 | minaret [il-minaret-32.21071-35.19023] | סרה [322_351:72:5] | 257.750983 | 0.000000 |
| ג'וניד (il-32.2254-35.2192) | 1280 | minaret [il-minaret-32.22028-35.23392] | שכם [322_352:27:9] | 109.845583 | 0.000000 |
| מסאכין (il-32.2287-35.3022) | 1280 | minaret [il-minaret-32.21806-35.28996] | מ.פ. עסכר (אל-קדים) [322_352:71:8] | 43.367698 | 7.709469 |
| בית וזן (il-32.2302-35.2157) | 375 | minaret [il-minaret-32.23006-35.25212] | שכם [322_352:41:14] | 114.123613 | 0.000000 |
| בית וזן (il-32.2302-35.2157) | 1280 | minaret [il-minaret-32.23006-35.25212] | שכם [322_352:41:14] | 390.732257 | 0.000000 |
| אלון מורה (il-32.2357-35.3316) | 375 | minaret [il-minaret-32.22769-35.30278] | מסאכין [322_353:2:13] | 91.692842 | 0.000000 |
| אלון מורה (il-32.2357-35.3316) | 1280 | minaret [il-minaret-32.22769-35.30278] | מסאכין [322_353:2:13] | 314.048681 | 0.000000 |
| איג'ניסיניא (il-32.2729-35.2166) | 1280 | minaret [il-minaret-32.26607-35.20086] | אל-נאקורה [322_352:0:31] | 6.000000 | 3.350517 |
| גאולים (il-32.2963-34.9474) | 375 | minaret [il-minaret-32.28595-34.96568] | קלנסווה [322_349:52:41] | 18.513740 | -0.442403 |
| גאולים (il-32.2963-34.9474) | 1280 | minaret [il-minaret-32.28595-34.96568] | קלנסווה [322_349:52:41] | 62.893639 | 0.000000 |
| ניצני עוז (il-32.3055-35.0049) | 375 | minaret [il-minaret-32.30453-35.03117] | טולכרם [323_350:24:2] | 86.093380 | 0.000000 |
| ניצני עוז (il-32.3055-35.0049) | 1280 | minaret [il-minaret-32.30453-35.03117] | טולכרם [323_350:24:2] | 295.282586 | 0.000000 |
| מית'לון (il-32.3478-35.2738) | 375 | minaret [il-minaret-32.34304-35.30514] | ג'ודידה [323_353:4:20] | 71.396411 | 0.000000 |
| מית'לון (il-32.3478-35.2738) | 1280 | minaret [il-minaret-32.34304-35.30514] | ג'ודידה [323_353:4:20] | 244.782754 | 0.000000 |
| כופיר (il-32.3721-35.3411) | 1280 | minaret [il-minaret-32.36397-35.31443] | סיר [323_353:11:30] | 324.223199 | 0.000000 |
| אל מנסורה (il-32.3862-35.2163) | 1280 | minaret [il-minaret-32.37586-35.23239] | אל זאויה [323_352:25:36] | 97.227075 | 0.000000 |
| חגלה (il-32.3875-34.9257) | 375 | synagogue [il-synagogue-32.38809-34.91196] | כפר הרא״ה [323_349:9:42] | 49.511745 | 0.747669 |
| חגלה (il-32.3875-34.9257) | 1280 | synagogue [il-synagogue-32.38809-34.91196] | כפר הרא״ה [323_349:9:42] | 169.185670 | 0.000000 |
| פחמה אל-ג'דידה (il-32.3893-35.2090) | 1280 | minaret [il-minaret-32.37586-35.23239] | אל זאויה [323_352:25:36] | 228.875289 | 0.000000 |
| עאבא (il-32.4617-35.3240) | 375 | minaret [il-minaret-32.45695-35.29699] | ג'נין‎ [324_352:77:27] | 80.594883 | 0.690515 |
| עאבא (il-32.4617-35.3240) | 1280 | minaret [il-minaret-32.45695-35.29699] | ג'נין‎ [324_352:77:27] | 273.978201 | 0.000000 |
| מיטב (il-32.5457-35.3013) | 375 | synagogue [il-synagogue-32.54502-35.31146] | פרזון [325_353:9:21] | 22.325922 | -0.307081 |
| מיטב (il-32.5457-35.3013) | 1280 | synagogue [il-synagogue-32.54502-35.31146] | פרזון [325_353:9:21] | 78.229880 | 0.000000 |
| יפעת (il-32.6772-35.2239) | 375 | synagogue [il-synagogue-32.67418-35.24273] | מגדל העמק [326_352:34:35] | 39.082094 | -0.544205 |
| יפעת (il-32.6772-35.2239) | 1280 | synagogue [il-synagogue-32.67418-35.24273] | מגדל העמק [326_352:34:35] | 133.477192 | 0.000000 |
| כפר החורש (il-32.7013-35.2742) | 1280 | minaret [il-minaret-32.70347-35.29766] | נצרת [327_352:78:1] | 293.929490 | -5.728706 |
| נווה עמיאל (il-32.7022-35.1374) | 1280 | synagogue [il-synagogue-32.70341-35.15822] | רמת ישי [327_351:46:1] | 43.042827 | 0.000000 |
| אלומות (il-32.7070-35.5463) | 1280 | synagogue [il-synagogue-32.7016-35.57525] | דגניה ב' [327_355:60:0] | 426.548483 | 0.000000 |
| כפר ביאליק (il-32.8204-35.0869) | 375 | synagogue [il-synagogue-32.81244-35.10151] | קרית אתא [328_351:1:5] | 31.062605 | 0.000000 |
| כפר ביאליק (il-32.8204-35.0869) | 1280 | synagogue [il-synagogue-32.81244-35.10151] | קרית אתא [328_351:1:5] | 108.166382 | 0.000000 |

### Glyphs by place

Each width cell reads saved phase 1 → round 1 → round 2 → round 3. `0` means no drawn worship glyph. Terrain is recorded or explicitly flat 100 m. The source IDs match the final glyphs. Both labelled review stills and their rendered geometry descriptions are in `stills/`; the Eleazar still retains a minaret and two neighbouring synagogues with visible separate town fabric.

| Place | Terrain | 375 px phase 1 → R1 → R2 → R3 | 1280 px phase 1 → R1 → R2 → R3 |
| --- | --- | --- | --- |
| שדמות מחולה (shadmot-mehola) | recorded | synagogue [il-synagogue-32.34648-35.53245] → synagogue [il-synagogue-32.34648-35.53245] → synagogue [il-synagogue-32.34648-35.53245] → synagogue [il-synagogue-32.34648-35.53245] | synagogue [il-synagogue-32.34648-35.53245] → synagogue [il-synagogue-32.34648-35.53245] → synagogue [il-synagogue-32.34648-35.53245] → synagogue [il-synagogue-32.34648-35.53245] |
| תל אביב (tel-aviv) | recorded | church [il-church-32.04777-34.77118] → church [il-church-32.04777-34.77118] → church [il-church-32.04777-34.77118] → church [il-church-32.04777-34.77118] | church [il-church-32.04777-34.77118] → church [il-church-32.04777-34.77118] → church [il-church-32.04777-34.77118] → church [il-church-32.04777-34.77118] |
| ירושלים (jerusalem) | recorded | minaret [il-minaret-31.763-35.26575]; westernWall [jerusalem-wall] → westernWall [jerusalem-wall] → westernWall [jerusalem-wall] → westernWall [jerusalem-wall] | minaret [il-minaret-31.763-35.26575]; westernWall [jerusalem-wall] → westernWall [jerusalem-wall] → westernWall [jerusalem-wall] → westernWall [jerusalem-wall] |
| חיפה (haifa) | recorded | babShrine [haifa-bab]; synagogue [il-synagogue-32.78535-35.01714] → babShrine [haifa-bab]; synagogue [il-synagogue-32.78535-35.01714] → babShrine [haifa-bab]; synagogue [il-synagogue-32.78535-35.01714] → babShrine [haifa-bab]; synagogue [il-synagogue-32.78535-35.01714] | babShrine [haifa-bab]; synagogue [il-synagogue-32.78535-35.01714] → babShrine [haifa-bab]; synagogue [il-synagogue-32.78535-35.01714] → babShrine [haifa-bab]; synagogue [il-synagogue-32.78535-35.01714] → babShrine [haifa-bab]; synagogue [il-synagogue-32.78535-35.01714] |
| ראש פינה (rosh-pina) | recorded | synagogue [il-synagogue-32.96568-35.54287] → synagogue [il-synagogue-32.96568-35.54287] → synagogue [il-synagogue-32.96568-35.54287] → synagogue [il-synagogue-32.96568-35.54287] | synagogue [il-synagogue-32.96568-35.54287] → synagogue [il-synagogue-32.96568-35.54287] → synagogue [il-synagogue-32.96568-35.54287] → synagogue [il-synagogue-32.96568-35.54287] |
| מכתש רמון (ramon-crater) | recorded | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טבריה (tiberias) | recorded | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין גדי (ein-gedi) | recorded | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמת גן (ramat-gan) | recorded | synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] | synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] |
| באר שבע (beer-sheva) | recorded | synagogue [il-synagogue-31.2487-34.7964] → synagogue [il-synagogue-31.2487-34.7964] → synagogue [il-synagogue-31.2487-34.7964] → synagogue [il-synagogue-31.2487-34.7964] | synagogue [il-synagogue-31.2487-34.7964] → synagogue [il-synagogue-31.2487-34.7964] → synagogue [il-synagogue-31.2487-34.7964] → synagogue [il-synagogue-31.2487-34.7964] |
| נתניה (netanya) | recorded | synagogue [il-synagogue-32.33509-34.85614] → synagogue [il-synagogue-32.33509-34.85614] → synagogue [il-synagogue-32.33509-34.85614] → synagogue [il-synagogue-32.33509-34.85614] | synagogue [il-synagogue-32.33509-34.85614] → synagogue [il-synagogue-32.33509-34.85614] → synagogue [il-synagogue-32.33509-34.85614] → synagogue [il-synagogue-32.33509-34.85614] |
| מצדה (masada) | recorded | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נהלל (nahalal) | recorded | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זכרון יעקב (zikhron-yaakov) | recorded | synagogue [il-synagogue-32.56936-34.9456]; synagogue [il-synagogue-32.57398-34.95381] → synagogue [il-synagogue-32.56936-34.9456]; synagogue [il-synagogue-32.57398-34.95381] → synagogue [il-synagogue-32.56936-34.9456]; synagogue [il-synagogue-32.57398-34.95381] → synagogue [il-synagogue-32.56936-34.9456]; synagogue [il-synagogue-32.57398-34.95381] | synagogue [il-synagogue-32.56936-34.9456]; synagogue [il-synagogue-32.57398-34.95381] → synagogue [il-synagogue-32.56936-34.9456]; synagogue [il-synagogue-32.57398-34.95381] → synagogue [il-synagogue-32.56936-34.9456]; synagogue [il-synagogue-32.57398-34.95381] → synagogue [il-synagogue-32.56936-34.9456]; synagogue [il-synagogue-32.57398-34.95381] |
| בית שאן (beit-shean) | recorded | synagogue [il-synagogue-32.49894-35.49309] → synagogue [il-synagogue-32.49894-35.49309] → synagogue [il-synagogue-32.49894-35.49309] → synagogue [il-synagogue-32.49894-35.49309] | synagogue [il-synagogue-32.49894-35.49309] → synagogue [il-synagogue-32.49894-35.49309] → synagogue [il-synagogue-32.49894-35.49309] → synagogue [il-synagogue-32.49894-35.49309] |
| יריחו (jericho) | recorded | church [il-church-31.85615-35.45667]; minaret [il-minaret-31.85468-35.46186]; minaret [il-minaret-31.86122-35.4765] → church [il-church-31.85615-35.45667]; minaret [il-minaret-31.85468-35.46186]; minaret [il-minaret-31.86122-35.4765] → church [il-church-31.85615-35.45667]; minaret [il-minaret-31.85468-35.46186]; minaret [il-minaret-31.86122-35.4765] → church [il-church-31.85615-35.45667]; minaret [il-minaret-31.85468-35.46186]; minaret [il-minaret-31.86122-35.4765] | church [il-church-31.85615-35.45667]; minaret [il-minaret-31.85468-35.46186]; minaret [il-minaret-31.86122-35.4765] → church [il-church-31.85615-35.45667]; minaret [il-minaret-31.85468-35.46186]; minaret [il-minaret-31.86122-35.4765] → church [il-church-31.85615-35.45667]; minaret [il-minaret-31.85468-35.46186]; minaret [il-minaret-31.86122-35.4765] → church [il-church-31.85615-35.45667]; minaret [il-minaret-31.85468-35.46186]; minaret [il-minaret-31.86122-35.4765] |
| קליה (kalya) | recorded | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נווה זוהר (neve-zohar) | recorded | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כרמי צור (karmei-tzur) | flat | synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] | synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] |
| כרמי צור (osm:way:462664109) | flat | observed minaret [il-minaret-31.58592-35.10681], own glyphs unenumerated → synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] | no production measurement → synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] → synagogue [il-synagogue-31.6097-35.10159] |
| אילת (il-29.5569-34.9498) | flat | synagogue [il-synagogue-29.55241-34.95227]; synagogue [il-synagogue-29.55914-34.93893] → synagogue [il-synagogue-29.55241-34.95227]; synagogue [il-synagogue-29.55914-34.93893] → synagogue [il-synagogue-29.55241-34.95227]; synagogue [il-synagogue-29.55914-34.93893] → synagogue [il-synagogue-29.55241-34.95227]; synagogue [il-synagogue-29.55914-34.93893] | synagogue [il-synagogue-29.55241-34.95227]; synagogue [il-synagogue-29.55914-34.93893] → synagogue [il-synagogue-29.55241-34.95227]; synagogue [il-synagogue-29.55914-34.93893] → synagogue [il-synagogue-29.55241-34.95227]; synagogue [il-synagogue-29.55914-34.93893] → synagogue [il-synagogue-29.55241-34.95227]; synagogue [il-synagogue-29.55914-34.93893] |
| אילות (il-29.5812-34.9627) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| באר אורה (il-29.7102-34.9866) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אליפז (il-29.7964-35.0119) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סמר (il-29.8334-35.0227) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יטבתה (il-29.8959-35.0596) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שחרות (il-29.9037-34.9992) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גרופית (il-29.9417-35.0642) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קטורה (il-29.9696-35.0611) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| לוטן (il-29.9868-35.0886) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נווה חריף (il-30.0389-35.0359) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נאות סמדר (il-30.0486-35.0257) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יהל (il-30.0819-35.1288) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שיטים (il-30.1768-35.0165) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פארן (il-30.3626-35.1539) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צוקים (il-30.4910-35.1659) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צופר (il-30.5586-35.1801) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מצפה רמון (il-30.6120-34.8012) | flat | synagogue [il-synagogue-30.61323-34.79719] → synagogue [il-synagogue-30.61323-34.79719] → synagogue [il-synagogue-30.61323-34.79719] → synagogue [il-synagogue-30.61323-34.79719] | synagogue [il-synagogue-30.61323-34.79719] → synagogue [il-synagogue-30.61323-34.79719] → synagogue [il-synagogue-30.61323-34.79719] → synagogue [il-synagogue-30.61323-34.79719] |
| ואדי אריכא (il-30.6869-34.7828) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ספיר (il-30.6141-35.1846) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין יהב (il-30.6569-35.2382) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עזוז (il-30.7917-34.4722) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עבדה (il-30.7522-34.7765) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חצבה (il-30.7677-35.2796) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין חצבה (il-30.7983-35.2464) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניצני סיני (il-30.9039-34.3969) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניצנה (il-30.8863-34.4219) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עבדה (il-30.8096-34.7561) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-בקאר (il-30.8490-34.7363) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מדרשת בן גוריון (il-30.8516-34.7826) | flat | synagogue [il-synagogue-30.85092-34.78227] → synagogue [il-synagogue-30.85092-34.78227] → synagogue [il-synagogue-30.85092-34.78227] → synagogue [il-synagogue-30.85092-34.78227] | synagogue [il-synagogue-30.85092-34.78227] → synagogue [il-synagogue-30.85092-34.78227] → synagogue [il-synagogue-30.85092-34.78227] → synagogue [il-synagogue-30.85092-34.78227] |
| שדה בוקר (il-30.8737-34.7926) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מרחב עם (il-30.8886-34.8289) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עידן (il-30.8060-35.2994) | flat | synagogue [il-synagogue-30.80657-35.3] → synagogue [il-synagogue-30.80657-35.3] → synagogue [il-synagogue-30.80657-35.3] → synagogue [il-synagogue-30.80657-35.3] | synagogue [il-synagogue-30.80657-35.3] → synagogue [il-synagogue-30.80657-35.3] → synagogue [il-synagogue-30.80657-35.3] → synagogue [il-synagogue-30.80657-35.3] |
| כמהין (il-30.9100-34.4310) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| באר מילכה (il-30.9328-34.4070) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אשלים (il-30.9639-34.7003) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טללים (il-30.9919-34.7701) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ירוחם (il-30.9888-34.9251) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ישוב בדואי (il-30.9854-34.9618) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין תמר (il-30.9433-35.3747) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ביר הדאג' (il-31.0263-34.7031) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רתמים (il-31.0539-34.6904) | flat | synagogue [il-synagogue-31.05492-34.69046] → synagogue [il-synagogue-31.05492-34.69046] → synagogue [il-synagogue-31.05492-34.69046] → synagogue [il-synagogue-31.05492-34.69046] | synagogue [il-synagogue-31.05492-34.69046] → synagogue [il-synagogue-31.05492-34.69046] → synagogue [il-synagogue-31.05492-34.69046] → synagogue [il-synagogue-31.05492-34.69046] |
| שיזף (il-31.0017-34.7655) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משאבי שדה (il-31.0033-34.7861) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רביבים (il-31.0432-34.7207) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רח'מה (il-31.0086-34.9557) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קצר א סיר (il-31.0794-34.9849) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| הוואשלה (il-31.0934-34.9774) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דימונה (il-31.0687-35.0367) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שלומית (il-31.1685-34.3036) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בני נצרים (il-31.1410-34.3147) | flat | synagogue [il-synagogue-31.14099-34.31383] → synagogue [il-synagogue-31.14099-34.31383] → synagogue [il-synagogue-31.14099-34.31383] → synagogue [il-synagogue-31.14099-34.31383] | synagogue [il-synagogue-31.14099-34.31383] → synagogue [il-synagogue-31.14099-34.31383] → synagogue [il-synagogue-31.14099-34.31383] → synagogue [il-synagogue-31.14099-34.31383] |
| נווה (il-31.1621-34.3301) | flat | synagogue [il-synagogue-31.16174-34.33136] → synagogue [il-synagogue-31.16174-34.33136] → synagogue [il-synagogue-31.16174-34.33136] → synagogue [il-synagogue-31.16174-34.33136] | synagogue [il-synagogue-31.16174-34.33136] → synagogue [il-synagogue-31.16174-34.33136] → synagogue [il-synagogue-31.16174-34.33136] → synagogue [il-synagogue-31.16174-34.33136] |
| אבשלום (il-31.1951-34.3308) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צאלים (il-31.2037-34.5338) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל דנפירי (il-31.1315-34.8164) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבו עפאש (il-31.1606-34.8074) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שגב שלום (il-31.2009-34.8401) | flat | minaret [il-minaret-31.19845-34.8357] → minaret [il-minaret-31.19845-34.8357] → minaret [il-minaret-31.19845-34.8357] → minaret [il-minaret-31.19845-34.8357] | minaret [il-minaret-31.19845-34.8357] → minaret [il-minaret-31.19845-34.8357] → minaret [il-minaret-31.19845-34.8357] → minaret [il-minaret-31.19845-34.8357] |
| אום מיתנאן (il-31.1262-34.9693) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבו עשיבה (il-31.1249-34.9587) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל ע'ול (il-31.1243-34.9965) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבו עמאר (il-31.1374-34.9533) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גינדל (il-31.1328-35.0122) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל עמראני (il-31.1679-34.9685) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבו ג'אמדה (il-31.1655-34.9804) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבו עמר (il-31.1857-34.9652) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית פלט (il-31.1859-34.9357) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבו תלול (il-31.1862-34.9128) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| المزرة (il-31.1503-35.0805) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-קטמאת (il-31.1731-35.0950) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין בוקק (il-31.2014-35.3639) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כרם שלום (il-31.2277-34.2839) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יתד (il-31.2060-34.3274) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חולית (il-31.2319-34.3265) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סופה (il-31.2365-34.3426) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניר יצחק (il-31.2379-34.3578) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ישע (il-31.2464-34.4032) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מבטחים (il-31.2418-34.4073) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עמיעוז (il-31.2483-34.4140) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבולות (il-31.2111-34.4652) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה ניצן (il-31.2285-34.4174) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צוחר (il-31.2361-34.4271) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תלמי אליהו (il-31.2300-34.4295) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אוהד (il-31.2377-34.4305) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין הבשור (il-31.2806-34.4438) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מגן (il-31.2991-34.4289) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אופקים (il-31.3126-34.6208) | flat | synagogue [il-synagogue-31.31383-34.62111] → synagogue [il-synagogue-31.31383-34.62111] → synagogue [il-synagogue-31.31383-34.62111] → synagogue [il-synagogue-31.31383-34.62111] | synagogue [il-synagogue-31.31383-34.62111] → synagogue [il-synagogue-31.31383-34.62111] → synagogue [il-synagogue-31.31383-34.62111] → synagogue [il-synagogue-31.31383-34.62111] |
| פדויים (il-31.3277-34.6121) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רנן (il-31.3378-34.6005) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חצרים (il-31.2404-34.7151) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר רפאל (il-31.2588-34.7480) | flat | 0 → 0 → synagogue [il-synagogue-31.26979-34.77085] → 0 | 0 → 0 → synagogue [il-synagogue-31.26979-34.77085] → 0 |
| נבטים (il-31.2225-34.8808) | flat | synagogue [il-synagogue-31.22184-34.88649]; synagogue [il-synagogue-31.22509-34.87406] → synagogue [il-synagogue-31.22184-34.88649]; synagogue [il-synagogue-31.22509-34.87406] → synagogue [il-synagogue-31.22184-34.88649]; synagogue [il-synagogue-31.22509-34.87406] → synagogue [il-synagogue-31.22184-34.88649]; synagogue [il-synagogue-31.22509-34.87406] | synagogue [il-synagogue-31.22184-34.88649]; synagogue [il-synagogue-31.22509-34.87406] → synagogue [il-synagogue-31.22184-34.88649]; synagogue [il-synagogue-31.22509-34.87406] → synagogue [il-synagogue-31.22184-34.88649]; synagogue [il-synagogue-31.22509-34.87406] → synagogue [il-synagogue-31.22184-34.88649]; synagogue [il-synagogue-31.22509-34.87406] |
| תל שבע (il-31.2457-34.8578) | flat | minaret [il-minaret-31.2471-34.86085] → minaret [il-minaret-31.2471-34.86085] → minaret [il-minaret-31.2471-34.86085] → minaret [il-minaret-31.2471-34.86085] | minaret [il-minaret-31.2471-34.86085] → minaret [il-minaret-31.2471-34.86085] → minaret [il-minaret-31.2471-34.86085] → minaret [il-minaret-31.2471-34.86085] |
| אבו רוקייק (il-31.2599-34.8638) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עומר (il-31.2659-34.8476) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אום בטין (il-31.2758-34.8839) | flat | minaret [il-minaret-31.24587-34.84899] → 0 → 0 → 0 | minaret [il-minaret-31.24587-34.84899] → 0 → 0 → 0 |
| תראבין א-צאנע (il-31.2805-34.8737) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אטרש (il-31.2540-34.9684) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סרעיאה (il-31.2621-34.9696) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ח'רבת אל-ווטן (il-31.2554-34.9238) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סעווה (il-31.2702-34.9613) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל סייד (il-31.2833-34.9130) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סייד (il-31.2812-34.9318) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עוקבי (il-31.2844-34.9300) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חורה (il-31.2972-34.9379) | flat | minaret [il-minaret-31.29468-34.93888] → minaret [il-minaret-31.29468-34.93888] → minaret [il-minaret-31.29468-34.93888] → minaret [il-minaret-31.29468-34.93888] | minaret [il-minaret-31.29468-34.93888] → minaret [il-minaret-31.29468-34.93888] → minaret [il-minaret-31.29468-34.93888] → minaret [il-minaret-31.29468-34.93888] |
| כסיפה (il-31.2465-35.0931) | flat | minaret [il-minaret-31.24723-35.0938]; minaret [il-minaret-31.24841-35.08599] → minaret [il-minaret-31.24723-35.0938]; minaret [il-minaret-31.24841-35.08599] → minaret [il-minaret-31.24723-35.0938]; minaret [il-minaret-31.24841-35.08599] → minaret [il-minaret-31.24723-35.0938]; minaret [il-minaret-31.24841-35.08599] | minaret [il-minaret-31.24723-35.0938]; minaret [il-minaret-31.24841-35.08599] → minaret [il-minaret-31.24723-35.0938]; minaret [il-minaret-31.24841-35.08599] → minaret [il-minaret-31.24723-35.0938]; minaret [il-minaret-31.24841-35.08599] → minaret [il-minaret-31.24723-35.0938]; minaret [il-minaret-31.24841-35.08599] |
| נצאצרה (il-31.2430-35.0302) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-באט (il-31.2705-35.0332) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דריג'את (il-31.3006-35.0754) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ערד (il-31.2612-35.2146) | flat | synagogue [il-synagogue-31.26737-35.21311] → synagogue [il-synagogue-31.26737-35.21311] → synagogue [il-synagogue-31.26737-35.21311] → synagogue [il-synagogue-31.26737-35.21311] | synagogue [il-synagogue-31.26737-35.21311] → synagogue [il-synagogue-31.26737-35.21311] → synagogue [il-synagogue-31.26737-35.21311] → synagogue [il-synagogue-31.26737-35.21311] |
| ג'נאביב (il-31.2874-35.1082) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תל ערד (il-31.2919-35.1453) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קבועה (il-31.2252-35.2171) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-מַוַ֫ואסִי (il-31.3551-34.2611) | flat | minaret [il-minaret-31.34367-34.30518]; minaret [il-minaret-31.34492-34.25372]; minaret [il-minaret-31.35185-34.30634] → minaret [il-minaret-31.34492-34.25372] → minaret [il-minaret-31.34492-34.25372] → minaret [il-minaret-31.34492-34.25372] | minaret [il-minaret-31.34367-34.30518]; minaret [il-minaret-31.34492-34.25372]; minaret [il-minaret-31.35185-34.30634] → minaret [il-minaret-31.34492-34.25372] → minaret [il-minaret-31.34492-34.25372] → minaret [il-minaret-31.34492-34.25372] |
| אל-קרארה (il-31.3783-34.3355) | flat | minaret [il-minaret-31.3535-34.33181]; minaret [il-minaret-31.37515-34.33137]; minaret [il-minaret-31.39212-34.3699] → minaret [il-minaret-31.37515-34.33137] → minaret [il-minaret-31.37515-34.33137] → minaret [il-minaret-31.37515-34.33137] | minaret [il-minaret-31.3535-34.33181]; minaret [il-minaret-31.37515-34.33137]; minaret [il-minaret-31.39212-34.3699] → minaret [il-minaret-31.37515-34.33137] → minaret [il-minaret-31.37515-34.33137] → minaret [il-minaret-31.37515-34.33137] |
| דיר אל-בלאח (il-31.4184-34.3503) | flat | minaret [il-minaret-31.41688-34.35209]; minaret [il-minaret-31.41766-34.35579]; minaret [il-minaret-31.42126-34.34748] → minaret [il-minaret-31.41688-34.35209]; minaret [il-minaret-31.41766-34.35579]; minaret [il-minaret-31.42126-34.34748] → minaret [il-minaret-31.41688-34.35209]; minaret [il-minaret-31.41766-34.35579]; minaret [il-minaret-31.42126-34.34748] → minaret [il-minaret-31.41688-34.35209]; minaret [il-minaret-31.41766-34.35579]; minaret [il-minaret-31.42126-34.34748] | minaret [il-minaret-31.41688-34.35209]; minaret [il-minaret-31.41766-34.35579]; minaret [il-minaret-31.42126-34.34748] → minaret [il-minaret-31.41688-34.35209]; minaret [il-minaret-31.41766-34.35579]; minaret [il-minaret-31.42126-34.34748] → minaret [il-minaret-31.41688-34.35209]; minaret [il-minaret-31.41766-34.35579]; minaret [il-minaret-31.42126-34.34748] → minaret [il-minaret-31.41688-34.35209]; minaret [il-minaret-31.41766-34.35579]; minaret [il-minaret-31.42126-34.34748] |
| ואדי א-סלקה (il-31.4001-34.3381) | flat | minaret [il-minaret-31.39774-34.33893]; minaret [il-minaret-31.40165-34.33745] → minaret [il-minaret-31.39774-34.33893]; minaret [il-minaret-31.40165-34.33745] → minaret [il-minaret-31.39774-34.33893]; minaret [il-minaret-31.40165-34.33745] → minaret [il-minaret-31.39774-34.33893]; minaret [il-minaret-31.40165-34.33745] | minaret [il-minaret-31.39774-34.33893]; minaret [il-minaret-31.40165-34.33745] → minaret [il-minaret-31.39774-34.33893]; minaret [il-minaret-31.40165-34.33745] → minaret [il-minaret-31.39774-34.33893]; minaret [il-minaret-31.40165-34.33745] → minaret [il-minaret-31.39774-34.33893]; minaret [il-minaret-31.40165-34.33745] |
| א-זאוואידה (il-31.4280-34.3653) | flat | minaret [il-minaret-31.42467-34.36563]; minaret [il-minaret-31.42684-34.34225]; minaret [il-minaret-31.44469-34.39572] → minaret [il-minaret-31.42467-34.36563] → minaret [il-minaret-31.42467-34.36563]; minaret [il-minaret-31.44469-34.39572] → minaret [il-minaret-31.42467-34.36563] | minaret [il-minaret-31.42467-34.36563]; minaret [il-minaret-31.42684-34.34225]; minaret [il-minaret-31.44469-34.39572] → minaret [il-minaret-31.42467-34.36563] → minaret [il-minaret-31.42467-34.36563]; minaret [il-minaret-31.44469-34.39572] → minaret [il-minaret-31.42467-34.36563] |
| נוסיראת (il-31.4491-34.3931) | flat | minaret [il-minaret-31.43657-34.40807]; minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44817-34.39142]; minaret [il-minaret-31.44836-34.39743] → minaret [il-minaret-31.44817-34.39142]; minaret [il-minaret-31.44836-34.39743] → minaret [il-minaret-31.44817-34.39142]; minaret [il-minaret-31.44836-34.39743] → minaret [il-minaret-31.44817-34.39142]; minaret [il-minaret-31.44836-34.39743] | minaret [il-minaret-31.43657-34.40807]; minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44817-34.39142]; minaret [il-minaret-31.44836-34.39743] → minaret [il-minaret-31.44817-34.39142]; minaret [il-minaret-31.44836-34.39743] → minaret [il-minaret-31.44817-34.39142]; minaret [il-minaret-31.44836-34.39743] → minaret [il-minaret-31.44817-34.39142]; minaret [il-minaret-31.44836-34.39743] |
| אל-מוסדר (il-31.4150-34.3764) | flat | minaret [il-minaret-31.40165-34.33745]; minaret [il-minaret-31.41571-34.37659]; minaret [il-minaret-31.42643-34.34989] → minaret [il-minaret-31.41409-34.34441]; minaret [il-minaret-31.41571-34.37659] → minaret [il-minaret-31.41409-34.34441]; minaret [il-minaret-31.41571-34.37659]; minaret [il-minaret-31.41766-34.35579] → minaret [il-minaret-31.41571-34.37659] | minaret [il-minaret-31.40165-34.33745]; minaret [il-minaret-31.41571-34.37659]; minaret [il-minaret-31.42643-34.34989] → minaret [il-minaret-31.41409-34.34441]; minaret [il-minaret-31.41571-34.37659] → minaret [il-minaret-31.41409-34.34441]; minaret [il-minaret-31.41571-34.37659]; minaret [il-minaret-31.41766-34.35579] → minaret [il-minaret-31.41409-34.34441]; minaret [il-minaret-31.41571-34.37659] |
| אל-בורייג' (il-31.4419-34.4032) | flat | minaret [il-minaret-31.42237-34.38566]; minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44287-34.40392]; minaret [il-minaret-31.44469-34.39572] → minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44287-34.40392] → minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44287-34.40392]; minaret [il-minaret-31.44469-34.39572] → minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44287-34.40392] | minaret [il-minaret-31.42113-34.39048]; minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44287-34.40392]; minaret [il-minaret-31.44469-34.39572] → minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44287-34.40392] → minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44287-34.40392]; minaret [il-minaret-31.44469-34.39572] → minaret [il-minaret-31.44176-34.40076]; minaret [il-minaret-31.44287-34.40392] |
| ניר עוז (il-31.3096-34.4008) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נירים (il-31.3352-34.3950) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין השלושה (il-31.3514-34.4010) | flat | synagogue [il-synagogue-31.35239-34.40034] → synagogue [il-synagogue-31.35239-34.40034] → synagogue [il-synagogue-31.35239-34.40034] → synagogue [il-synagogue-31.35239-34.40034] | synagogue [il-synagogue-31.35239-34.40034] → synagogue [il-synagogue-31.35239-34.40034] → synagogue [il-synagogue-31.35239-34.40034] → synagogue [il-synagogue-31.35239-34.40034] |
| כיסופים (il-31.3742-34.3995) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רעים (il-31.3848-34.4586) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אורים (il-31.3042-34.5220) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עדי נגב - נחלת ערן (il-31.3155-34.5946) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מסלול (il-31.3253-34.5886) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פטיש (il-31.3274-34.5603) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מלילות (il-31.3900-34.5959) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעגלים (il-31.3974-34.5983) | flat | synagogue [il-synagogue-31.39962-34.5978] → synagogue [il-synagogue-31.39962-34.5978] → synagogue [il-synagogue-31.39962-34.5978] → synagogue [il-synagogue-31.39962-34.5978] | synagogue [il-synagogue-31.39962-34.5978] → synagogue [il-synagogue-31.39962-34.5978] → synagogue [il-synagogue-31.39962-34.5978] → synagogue [il-synagogue-31.39962-34.5978] |
| גבעולים (il-31.3964-34.5915) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שרשרת (il-31.4046-34.6041) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גילת (il-31.3292-34.6516) | flat | synagogue [il-synagogue-31.32992-34.65199] → synagogue [il-synagogue-31.32992-34.65199] → synagogue [il-synagogue-31.32992-34.65199] → synagogue [il-synagogue-31.32992-34.65199] | synagogue [il-synagogue-31.32992-34.65199] → synagogue [il-synagogue-31.32992-34.65199] → synagogue [il-synagogue-31.32992-34.65199] → synagogue [il-synagogue-31.32992-34.65199] |
| אשל הנשיא (il-31.3253-34.6978) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בטחה (il-31.3343-34.6345) | flat | synagogue [il-synagogue-31.33276-34.63337] → synagogue [il-synagogue-31.33276-34.63337] → synagogue [il-synagogue-31.33276-34.63337] → synagogue [il-synagogue-31.33276-34.63337] | synagogue [il-synagogue-31.33276-34.63337] → synagogue [il-synagogue-31.33276-34.63337] → synagogue [il-synagogue-31.33276-34.63337] → synagogue [il-synagogue-31.33276-34.63337] |
| ברוש (il-31.3707-34.6351) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תאשור (il-31.3719-34.6437) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תדהר (il-31.3790-34.6285) | flat | synagogue [il-synagogue-31.37872-34.63134] → synagogue [il-synagogue-31.37872-34.63134] → synagogue [il-synagogue-31.37872-34.63134] → synagogue [il-synagogue-31.37872-34.63134] | synagogue [il-synagogue-31.37872-34.63134] → synagogue [il-synagogue-31.37872-34.63134] → synagogue [il-synagogue-31.37872-34.63134] → synagogue [il-synagogue-31.37872-34.63134] |
| שיבולים (il-31.3960-34.6089) | flat | synagogue [il-synagogue-31.39649-34.60801] → synagogue [il-synagogue-31.39649-34.60801] → synagogue [il-synagogue-31.39649-34.60801] → synagogue [il-synagogue-31.39649-34.60801] | synagogue [il-synagogue-31.39649-34.60801] → synagogue [il-synagogue-31.39649-34.60801] → synagogue [il-synagogue-31.39649-34.60801] → synagogue [il-synagogue-31.39649-34.60801] |
| תראבין א-צאנע (il-31.3428-34.7356) | flat | minaret [il-minaret-31.34545-34.7372] → minaret [il-minaret-31.34545-34.7372] → minaret [il-minaret-31.34545-34.7372] → minaret [il-minaret-31.34545-34.7372] | minaret [il-minaret-31.34545-34.7372] → minaret [il-minaret-31.34545-34.7372] → minaret [il-minaret-31.34545-34.7372] → minaret [il-minaret-31.34545-34.7372] |
| אל-עראקיב (il-31.3462-34.7797) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעות בר (il-31.3556-34.7592) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משמר הנגב (il-31.3641-34.7187) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חורבת בקר (il-31.3628-34.7469) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רהט (il-31.3934-34.7547) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שובל (il-31.4143-34.7438) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כרמית (il-31.3316-34.8935) | flat | synagogue [il-synagogue-31.33045-34.8915] → synagogue [il-synagogue-31.33045-34.8915] → synagogue [il-synagogue-31.33045-34.8915] → synagogue [il-synagogue-31.33045-34.8915] | synagogue [il-synagogue-31.33045-34.8915] → synagogue [il-synagogue-31.33045-34.8915] → synagogue [il-synagogue-31.33045-34.8915] → synagogue [il-synagogue-31.33045-34.8915] |
| להבים (il-31.3703-34.8137) | flat | synagogue [il-synagogue-31.37313-34.81678] → synagogue [il-synagogue-31.37313-34.81678] → synagogue [il-synagogue-31.37313-34.81678] → synagogue [il-synagogue-31.37313-34.81678] | synagogue [il-synagogue-31.37313-34.81678] → synagogue [il-synagogue-31.37313-34.81678] → synagogue [il-synagogue-31.37313-34.81678] → synagogue [il-synagogue-31.37313-34.81678] |
| סנסנה (il-31.3629-34.9034) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל עביד (il-31.3669-34.8618) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| להב (il-31.3794-34.8701) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אשכולות (il-31.3912-34.9047) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמאדין (il-31.3809-34.9116) | flat | minaret [il-minaret-31.38059-34.91081] → minaret [il-minaret-31.38059-34.91081] → minaret [il-minaret-31.38059-34.91081] → minaret [il-minaret-31.38059-34.91081] | minaret [il-minaret-31.38059-34.91081] → minaret [il-minaret-31.38059-34.91081] → minaret [il-minaret-31.38059-34.91081] → minaret [il-minaret-31.38059-34.91081] |
| מיתר (il-31.3271-34.9384) | flat | synagogue [il-synagogue-31.32245-34.94309]; synagogue [il-synagogue-31.32704-34.93633] → synagogue [il-synagogue-31.32245-34.94309]; synagogue [il-synagogue-31.32704-34.93633] → synagogue [il-synagogue-31.32245-34.94309]; synagogue [il-synagogue-31.32704-34.93633] → synagogue [il-synagogue-31.32245-34.94309]; synagogue [il-synagogue-31.32704-34.93633] | synagogue [il-synagogue-31.32245-34.94309]; synagogue [il-synagogue-31.32704-34.93633] → synagogue [il-synagogue-31.32245-34.94309]; synagogue [il-synagogue-31.32704-34.93633] → synagogue [il-synagogue-31.32245-34.94309]; synagogue [il-synagogue-31.32704-34.93633] → synagogue [il-synagogue-31.32245-34.94309]; synagogue [il-synagogue-31.32704-34.93633] |
| כרמים (il-31.3356-34.9190) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טנא עומרים (il-31.3757-34.9573) | flat | synagogue [il-synagogue-31.37771-34.95681] → synagogue [il-synagogue-31.37771-34.95681] → synagogue [il-synagogue-31.37771-34.95681] → synagogue [il-synagogue-31.37771-34.95681] | synagogue [il-synagogue-31.37771-34.95681] → synagogue [il-synagogue-31.37771-34.95681] → synagogue [il-synagogue-31.37771-34.95681] → synagogue [il-synagogue-31.37771-34.95681] |
| ח'רבת זנוטה (il-31.3713-34.9954) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ענב אלכביר (il-31.3970-34.9278) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ד'הרייה (il-31.4077-34.9711) | flat | minaret [il-minaret-31.40874-34.97103]; minaret [il-minaret-31.40955-34.97494] → minaret [il-minaret-31.40874-34.97103]; minaret [il-minaret-31.40955-34.97494] → minaret [il-minaret-31.40874-34.97103]; minaret [il-minaret-31.40955-34.97494] → minaret [il-minaret-31.40874-34.97103]; minaret [il-minaret-31.40955-34.97494] | minaret [il-minaret-31.40874-34.97103]; minaret [il-minaret-31.40955-34.97494] → minaret [il-minaret-31.40874-34.97103]; minaret [il-minaret-31.40955-34.97494] → minaret [il-minaret-31.40874-34.97103]; minaret [il-minaret-31.40955-34.97494] → minaret [il-minaret-31.40874-34.97103]; minaret [il-minaret-31.40955-34.97494] |
| עתיר (il-31.3245-35.0273) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| הר עמשא (il-31.3426-35.1022) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שני (il-31.3563-35.0693) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עשהאל (il-31.3734-35.0438) | flat | synagogue [il-synagogue-31.37326-35.04383] → synagogue [il-synagogue-31.37326-35.04383] → synagogue [il-synagogue-31.37326-35.04383] → synagogue [il-synagogue-31.37326-35.04383] | synagogue [il-synagogue-31.37326-35.04383] → synagogue [il-synagogue-31.37326-35.04383] → synagogue [il-synagogue-31.37326-35.04383] → synagogue [il-synagogue-31.37326-35.04383] |
| סמוע (il-31.3991-35.0670) | flat | minaret [il-minaret-31.39874-35.06773]; minaret [il-minaret-31.40129-35.06224] → minaret [il-minaret-31.39874-35.06773]; minaret [il-minaret-31.40129-35.06224] → minaret [il-minaret-31.39874-35.06773]; minaret [il-minaret-31.40129-35.06224] → minaret [il-minaret-31.39874-35.06773]; minaret [il-minaret-31.40129-35.06224] | minaret [il-minaret-31.39874-35.06773]; minaret [il-minaret-31.40129-35.06224] → minaret [il-minaret-31.39874-35.06773]; minaret [il-minaret-31.40129-35.06224] → minaret [il-minaret-31.39874-35.06773]; minaret [il-minaret-31.40129-35.06224] → minaret [il-minaret-31.39874-35.06773]; minaret [il-minaret-31.40129-35.06224] |
| ראפאת (il-31.3866-35.0631) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שמעה (il-31.3876-35.0133) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מצפה אשתמוע (il-31.3934-35.0162) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית יתיר (il-31.3655-35.1117) | flat | synagogue [il-synagogue-31.36279-35.11447] → synagogue [il-synagogue-31.36279-35.11447] → synagogue [il-synagogue-31.36279-35.11447] → synagogue [il-synagogue-31.36279-35.11447] | synagogue [il-synagogue-31.36279-35.11447] → synagogue [il-synagogue-31.36279-35.11447] → synagogue [il-synagogue-31.36279-35.11447] → synagogue [il-synagogue-31.36279-35.11447] |
| אמנייזיל (il-31.3711-35.1046) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג'ינבה (il-31.3630-35.1397) | flat | minaret [il-minaret-31.36401-35.13973] → minaret [il-minaret-31.36401-35.13973] → minaret [il-minaret-31.36401-35.13973] → minaret [il-minaret-31.36401-35.13973] | minaret [il-minaret-31.36401-35.13973] → minaret [il-minaret-31.36401-35.13973] → minaret [il-minaret-31.36401-35.13973] → minaret [il-minaret-31.36401-35.13973] |
| מירקז (il-31.3630-35.1508) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חאלאווה (il-31.3649-35.1575) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ביר אעיד (il-31.3747-35.1308) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חירבת אל פרחיית (il-31.3819-35.1740) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חירבת אל מג'אז (il-31.3786-35.1888) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מצפה יאיר (il-31.3833-35.1348) | flat | synagogue [il-synagogue-31.38341-35.13472] → synagogue [il-synagogue-31.38341-35.13472] → synagogue [il-synagogue-31.38341-35.13472] → synagogue [il-synagogue-31.38341-35.13472] | synagogue [il-synagogue-31.38341-35.13472] → synagogue [il-synagogue-31.38341-35.13472] → synagogue [il-synagogue-31.38341-35.13472] → synagogue [il-synagogue-31.38341-35.13472] |
| סוסיה (il-31.3920-35.1135) | flat | synagogue [il-synagogue-31.39221-35.11236] → synagogue [il-synagogue-31.39221-35.11236] → synagogue [il-synagogue-31.39221-35.11236] → synagogue [il-synagogue-31.39221-35.11236] | synagogue [il-synagogue-31.39221-35.11236] → synagogue [il-synagogue-31.39221-35.11236] → synagogue [il-synagogue-31.39221-35.11236] → synagogue [il-synagogue-31.39221-35.11236] |
| איספיי אל פוקה (il-31.3982-35.1804) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סוסיא הערבית (il-31.4011-35.1087) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אביגיל (il-31.4028-35.1419) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר הנוקדים (il-31.3053-35.2693) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דקייקה (il-31.3832-35.2249) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בארי (il-31.4242-34.4911) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נחל עוז (il-31.4724-34.4982) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עזה (il-31.5129-34.4581) | flat | minaret [il-minaret-31.4998-34.46938]; minaret [il-minaret-31.50349-34.4743]; minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.508-34.46334] → minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.508-34.46334] → minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.508-34.46334] → minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.508-34.46334] | minaret [il-minaret-31.4998-34.46938]; minaret [il-minaret-31.50349-34.4743]; minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.508-34.46334] → minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.508-34.46334] → minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.508-34.46334] → minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.508-34.46334] |
| ג'באליה (il-31.5282-34.4832) | flat | minaret [il-minaret-31.508-34.46334]; minaret [il-minaret-31.51751-34.47441]; minaret [il-minaret-31.52768-34.48248] → minaret [il-minaret-31.52768-34.48248] → minaret [il-minaret-31.52768-34.48248] → minaret [il-minaret-31.52768-34.48248] | minaret [il-minaret-31.508-34.46334]; minaret [il-minaret-31.51751-34.47441]; minaret [il-minaret-31.52768-34.48248] → minaret [il-minaret-31.52768-34.48248] → minaret [il-minaret-31.52768-34.48248] → minaret [il-minaret-31.52768-34.48248] |
| נתיבות (il-31.4214-34.5884) | flat | synagogue [il-synagogue-31.41765-34.58676]; synagogue [il-synagogue-31.42215-34.59248]; synagogue [il-synagogue-31.43615-34.58372] → synagogue [il-synagogue-31.41765-34.58676]; synagogue [il-synagogue-31.42215-34.59248]; synagogue [il-synagogue-31.43615-34.58372] → synagogue [il-synagogue-31.41765-34.58676]; synagogue [il-synagogue-31.42215-34.59248]; synagogue [il-synagogue-31.43615-34.58372] → synagogue [il-synagogue-31.41765-34.58676]; synagogue [il-synagogue-31.42215-34.59248]; synagogue [il-synagogue-31.43615-34.58372] | synagogue [il-synagogue-31.41765-34.58676]; synagogue [il-synagogue-31.42215-34.59248]; synagogue [il-synagogue-31.43615-34.58372] → synagogue [il-synagogue-31.41765-34.58676]; synagogue [il-synagogue-31.42215-34.59248]; synagogue [il-synagogue-31.43615-34.58372] → synagogue [il-synagogue-31.41765-34.58676]; synagogue [il-synagogue-31.42215-34.59248]; synagogue [il-synagogue-31.43615-34.58372] → synagogue [il-synagogue-31.41765-34.58676]; synagogue [il-synagogue-31.42215-34.59248]; synagogue [il-synagogue-31.43615-34.58372] |
| תקומה (il-31.4486-34.5776) | flat | synagogue [il-synagogue-31.43991-34.57704]; synagogue [il-synagogue-31.44996-34.57796] → synagogue [il-synagogue-31.43991-34.57704]; synagogue [il-synagogue-31.44996-34.57796] → synagogue [il-synagogue-31.43991-34.57704]; synagogue [il-synagogue-31.44996-34.57796] → synagogue [il-synagogue-31.43991-34.57704]; synagogue [il-synagogue-31.44996-34.57796] | synagogue [il-synagogue-31.43991-34.57704]; synagogue [il-synagogue-31.44996-34.57796] → synagogue [il-synagogue-31.43991-34.57704]; synagogue [il-synagogue-31.44996-34.57796] → synagogue [il-synagogue-31.43991-34.57704]; synagogue [il-synagogue-31.44996-34.57796] → synagogue [il-synagogue-31.43991-34.57704]; synagogue [il-synagogue-31.44996-34.57796] |
| בית הגדי (il-31.4239-34.6067) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שוקדה (il-31.4217-34.5254) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר מימון (il-31.4308-34.5364) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תושייה (il-31.4332-34.5412) | flat | synagogue [il-synagogue-31.43346-34.53872] → synagogue [il-synagogue-31.43346-34.53872] → synagogue [il-synagogue-31.43346-34.53872] → synagogue [il-synagogue-31.43346-34.53872] | synagogue [il-synagogue-31.43346-34.53872] → synagogue [il-synagogue-31.43346-34.53872] → synagogue [il-synagogue-31.43346-34.53872] → synagogue [il-synagogue-31.43346-34.53872] |
| שובה (il-31.4500-34.5454) | flat | synagogue [il-synagogue-31.4505-34.54511] → synagogue [il-synagogue-31.4505-34.54511] → synagogue [il-synagogue-31.4505-34.54511] → synagogue [il-synagogue-31.4505-34.54511] | synagogue [il-synagogue-31.4505-34.54511] → synagogue [il-synagogue-31.4505-34.54511] → synagogue [il-synagogue-31.4505-34.54511] → synagogue [il-synagogue-31.4505-34.54511] |
| זימרת (il-31.4473-34.5523) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עלומים (il-31.4521-34.5137) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סעד (il-31.4700-34.5355) | flat | synagogue [il-synagogue-31.47031-34.53274] → synagogue [il-synagogue-31.47031-34.53274] → synagogue [il-synagogue-31.47031-34.53274] → synagogue [il-synagogue-31.47031-34.53274] | synagogue [il-synagogue-31.47031-34.53274] → synagogue [il-synagogue-31.47031-34.53274] → synagogue [il-synagogue-31.47031-34.53274] → synagogue [il-synagogue-31.47031-34.53274] |
| כפר עזה (il-31.4833-34.5333) | flat | minaret [il-minaret-31.50416-34.46902] → 0 → 0 → 0 | minaret [il-minaret-31.50416-34.46902] → 0 → 0 → 0 |
| יכיני (il-31.4832-34.6001) | flat | minaret [il-minaret-31.50416-34.46902] → 0 → 0 → 0 | minaret [il-minaret-31.50416-34.46902] → 0 → 0 → 0 |
| מפלסים (il-31.5027-34.5621) | flat | minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 | minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 |
| פעמי תש"ז (il-31.4382-34.6930) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תלמי ביל״ו (il-31.4377-34.6455) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יושיביה (il-31.4435-34.6091) | flat | minaret [il-minaret-31.4998-34.46938] → 0 → 0 → 0 | minaret [il-minaret-31.4998-34.46938] → 0 → 0 → 0 |
| אשבול (il-31.4475-34.6664) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מבועים (il-31.4493-34.6547) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קלחים (il-31.4506-34.6781) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זרועה (il-31.4594-34.6235) | flat | minaret [il-minaret-31.4998-34.46938] → 0 → 0 → 0 | minaret [il-minaret-31.4998-34.46938] → 0 → 0 → 0 |
| שבי דרום (il-31.4656-34.6358) | flat | minaret [il-minaret-31.4998-34.46938]; synagogue [il-synagogue-31.46561-34.63577] → synagogue [il-synagogue-31.46561-34.63577] → synagogue [il-synagogue-31.46561-34.63577] → synagogue [il-synagogue-31.46561-34.63577] | minaret [il-minaret-31.4998-34.46938]; synagogue [il-synagogue-31.46561-34.63577] → synagogue [il-synagogue-31.46561-34.63577] → synagogue [il-synagogue-31.46561-34.63577] → synagogue [il-synagogue-31.46561-34.63577] |
| ניר עקיבא (il-31.4695-34.6455) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניר משה (il-31.4773-34.6300) | flat | minaret [il-minaret-31.50416-34.46902] → 0 → 0 → 0 | minaret [il-minaret-31.50416-34.46902] → 0 → 0 → 0 |
| זיאדנה (il-31.4135-34.7745) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| הוזייל (il-31.4149-34.7610) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית קמה (il-31.4475-34.7623) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה צבי (il-31.4485-34.7133) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רוחמה (il-31.4971-34.7067) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דביר (il-31.4135-34.8233) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שומריה (il-31.4318-34.8858) | flat | synagogue [il-synagogue-31.4321-34.88227] → synagogue [il-synagogue-31.4321-34.88227] → synagogue [il-synagogue-31.4321-34.88227] → synagogue [il-synagogue-31.4321-34.88227] | synagogue [il-synagogue-31.4321-34.88227] → synagogue [il-synagogue-31.4321-34.88227] → synagogue [il-synagogue-31.4321-34.88227] → synagogue [il-synagogue-31.4321-34.88227] |
| אל-בורג' (il-31.4324-34.9242) | flat | minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] | minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] |
| אל בירה (il-31.4391-34.9258) | flat | minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] | minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] → minaret [il-minaret-31.43496-34.92083] |
| ח'רסא (il-31.4408-34.9983) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית א-רוש אל-פקווה (il-31.4526-34.9263) | flat | minaret [il-minaret-31.45062-34.92676] → minaret [il-minaret-31.45062-34.92676] → minaret [il-minaret-31.45062-34.92676] → minaret [il-minaret-31.45062-34.92676] | minaret [il-minaret-31.45062-34.92676] → minaret [il-minaret-31.45062-34.92676] → minaret [il-minaret-31.45062-34.92676] → minaret [il-minaret-31.45062-34.92676] |
| בית א-רוש אל-תחתא (il-31.4626-34.9353) | flat | minaret [il-minaret-31.46248-34.9393] → minaret [il-minaret-31.46248-34.9393] → minaret [il-minaret-31.46248-34.9393] → minaret [il-minaret-31.46248-34.9393] | minaret [il-minaret-31.46248-34.9393] → minaret [il-minaret-31.46248-34.9393] → minaret [il-minaret-31.46248-34.9393] → minaret [il-minaret-31.46248-34.9393] |
| דיר אל-עסל אל-פוקא (il-31.4680-34.9384) | flat | minaret [il-minaret-31.46603-34.93676] → minaret [il-minaret-31.46603-34.93676] → minaret [il-minaret-31.46603-34.93676] → minaret [il-minaret-31.46603-34.93676] | minaret [il-minaret-31.46603-34.93676] → minaret [il-minaret-31.46603-34.93676] → minaret [il-minaret-31.46603-34.93676] → minaret [il-minaret-31.46603-34.93676] |
| דיר אל-עסל אל תחתא (il-31.4732-34.9451) | flat | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 |
| אסקייק (il-31.4651-34.9561) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| א-סורה (il-31.4715-35.0022) | flat | minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46819-34.99784] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46819-34.99784] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46819-34.99784] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46819-34.99784] | minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46819-34.99784] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46819-34.99784] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46819-34.99784] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46819-34.99784] |
| אמריש (il-31.4708-35.0123) | flat | minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46635-35.015] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46635-35.015] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46635-35.015] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46635-35.015] | minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46635-35.015] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46635-35.015] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46635-35.015] → minaret [il-minaret-31.46592-35.01085]; minaret [il-minaret-31.46635-35.015] |
| נטע (il-31.4779-34.9266) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מג'ד (il-31.4806-34.9511) | flat | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 |
| סיכה (il-31.4921-34.9445) | flat | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 |
| נגוהות (il-31.4932-34.9834) | flat | minaret [il-minaret-31.5283-35.10379]; synagogue [il-synagogue-31.49322-34.98337] → synagogue [il-synagogue-31.49322-34.98337] → synagogue [il-synagogue-31.49322-34.98337] → synagogue [il-synagogue-31.49322-34.98337] | minaret [il-minaret-31.5283-35.10379]; synagogue [il-synagogue-31.49322-34.98337] → synagogue [il-synagogue-31.49322-34.98337] → synagogue [il-synagogue-31.49322-34.98337] → synagogue [il-synagogue-31.49322-34.98337] |
| בית עווא (il-31.5061-34.9516) | flat | minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.50644-34.95302]; minaret [il-minaret-31.50969-34.94725]; minaret [il-minaret-31.5283-35.10379] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.50644-34.95302]; minaret [il-minaret-31.50969-34.94725] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.50644-34.95302]; minaret [il-minaret-31.50969-34.94725] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.50644-34.95302]; minaret [il-minaret-31.50969-34.94725] | minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.50644-34.95302]; minaret [il-minaret-31.50969-34.94725]; minaret [il-minaret-31.5283-35.10379] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.50644-34.95302]; minaret [il-minaret-31.50969-34.94725] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.50644-34.95302]; minaret [il-minaret-31.50969-34.94725] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.50644-34.95302]; minaret [il-minaret-31.50969-34.94725] |
| א־סימיא (il-31.4164-35.0412) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יטא (il-31.4453-35.0900) | flat | minaret [il-minaret-31.44572-35.08967] → minaret [il-minaret-31.44572-35.08967] → minaret [il-minaret-31.44572-35.08967] → minaret [il-minaret-31.44572-35.08967] | minaret [il-minaret-31.44572-35.08967] → minaret [il-minaret-31.44572-35.08967] → minaret [il-minaret-31.44572-35.08967] → minaret [il-minaret-31.44572-35.08967] |
| עתניאל (il-31.4393-35.0286) | flat | minaret [il-minaret-31.41737-34.9841]; synagogue [il-synagogue-31.44096-35.0282] → synagogue [il-synagogue-31.44096-35.0282] → synagogue [il-synagogue-31.44096-35.0282] → synagogue [il-synagogue-31.44096-35.0282] | minaret [il-minaret-31.41737-34.9841]; synagogue [il-synagogue-31.44096-35.0282] → synagogue [il-synagogue-31.44096-35.0282] → synagogue [il-synagogue-31.44096-35.0282] → synagogue [il-synagogue-31.44096-35.0282] |
| כרמה (il-31.4515-35.0273) | flat | minaret [il-minaret-31.45221-35.02766] → minaret [il-minaret-31.45221-35.02766] → minaret [il-minaret-31.45221-35.02766] → minaret [il-minaret-31.45221-35.02766] | minaret [il-minaret-31.45221-35.02766] → minaret [il-minaret-31.45221-35.02766] → minaret [il-minaret-31.45221-35.02766] → minaret [il-minaret-31.45221-35.02766] |
| בית עמרה (il-31.4502-35.0482) | flat | minaret [il-minaret-31.44873-35.08854]; minaret [il-minaret-31.45015-35.05099] → minaret [il-minaret-31.45015-35.05099] → minaret [il-minaret-31.44663-35.07342]; minaret [il-minaret-31.45015-35.05099]; minaret [il-minaret-31.45221-35.02766] → minaret [il-minaret-31.44663-35.07342]; minaret [il-minaret-31.45015-35.05099] | minaret [il-minaret-31.44873-35.08854]; minaret [il-minaret-31.45015-35.05099] → minaret [il-minaret-31.45015-35.05099] → minaret [il-minaret-31.44663-35.07342]; minaret [il-minaret-31.45015-35.05099]; minaret [il-minaret-31.45221-35.02766] → minaret [il-minaret-31.44663-35.07342]; minaret [il-minaret-31.45015-35.05099] |
| א-ריחייא (il-31.4695-35.0776) | flat | minaret [il-minaret-31.44243-35.09943] → minaret [il-minaret-31.44873-35.08854]; minaret [il-minaret-31.45144-35.09033] → minaret [il-minaret-31.44873-35.08854]; minaret [il-minaret-31.45144-35.09033] → 0 | minaret [il-minaret-31.44243-35.09943] → minaret [il-minaret-31.44873-35.08854]; minaret [il-minaret-31.45144-35.09033] → minaret [il-minaret-31.44873-35.08854]; minaret [il-minaret-31.45144-35.09033] → 0 |
| האדאב אל פאוואר (il-31.4760-35.0534) | flat | minaret [il-minaret-31.46715-35.0774]; minaret [il-minaret-31.47563-35.05359] → minaret [il-minaret-31.47563-35.05359] → minaret [il-minaret-31.47563-35.05359] → minaret [il-minaret-31.47563-35.05359] | minaret [il-minaret-31.45144-35.09033]; minaret [il-minaret-31.46715-35.0774]; minaret [il-minaret-31.47563-35.05359] → minaret [il-minaret-31.47563-35.05359] → minaret [il-minaret-31.47563-35.05359] → minaret [il-minaret-31.47563-35.05359] |
| אל פאוור (il-31.4806-35.0613) | flat | minaret [il-minaret-31.45221-35.02766]; minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] | minaret [il-minaret-31.45221-35.02766]; minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] |
| ח'רסא (il-31.4834-35.0178) | flat | minaret [il-minaret-31.47563-35.05359] → 0 → 0 → 0 | minaret [il-minaret-31.47563-35.05359] → 0 → 0 → 0 |
| Al Tabaqa (il-31.4904-35.0215) | flat | 0 → minaret [il-minaret-31.47563-35.05359]; minaret [il-minaret-31.47985-35.05615] → minaret [il-minaret-31.47563-35.05359]; minaret [il-minaret-31.47985-35.05615] → minaret [il-minaret-31.47985-35.05615] | 0 → minaret [il-minaret-31.47563-35.05359]; minaret [il-minaret-31.47985-35.05615] → minaret [il-minaret-31.47563-35.05359]; minaret [il-minaret-31.47985-35.05615] → minaret [il-minaret-31.47563-35.05359]; minaret [il-minaret-31.47985-35.05615] |
| דורה (il-31.5066-35.0264) | flat | minaret [il-minaret-31.48276-35.05807]; minaret [il-minaret-31.50807-35.02637] → minaret [il-minaret-31.50807-35.02637] → minaret [il-minaret-31.50807-35.02637] → minaret [il-minaret-31.50807-35.02637] | minaret [il-minaret-31.48276-35.05807]; minaret [il-minaret-31.50807-35.02637] → minaret [il-minaret-31.50807-35.02637] → minaret [il-minaret-31.50807-35.02637] → minaret [il-minaret-31.50807-35.02637] |
| אל היג'רה (il-31.4904-35.0545) | flat | minaret [il-minaret-31.48276-35.05807]; minaret [il-minaret-31.50268-35.05984] → minaret [il-minaret-31.50268-35.05984] → minaret [il-minaret-31.50268-35.05984] → minaret [il-minaret-31.50268-35.05984] | minaret [il-minaret-31.48276-35.05807]; minaret [il-minaret-31.50268-35.05984] → minaret [il-minaret-31.50268-35.05984] → minaret [il-minaret-31.50268-35.05984] → minaret [il-minaret-31.50268-35.05984] |
| טראמה (il-31.4804-35.0318) | flat | minaret [il-minaret-31.47563-35.05359] → minaret [il-minaret-31.47985-35.05615] → minaret [il-minaret-31.47985-35.05615] → 0 | minaret [il-minaret-31.47563-35.05359] → minaret [il-minaret-31.47985-35.05615] → minaret [il-minaret-31.47985-35.05615] → 0 |
| בית חגי (il-31.4934-35.0804) | flat | 0 → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → 0 | 0 → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] → minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.48017-35.0603] |
| חברון (il-31.5289-35.0945) | flat | minaret [il-minaret-31.5281-35.09238]; minaret [il-minaret-31.5283-35.10379] → minaret [il-minaret-31.5281-35.09238]; minaret [il-minaret-31.5283-35.10379] → minaret [il-minaret-31.5281-35.09238]; minaret [il-minaret-31.5283-35.10379] → minaret [il-minaret-31.5281-35.09238]; minaret [il-minaret-31.5283-35.10379] | minaret [il-minaret-31.5281-35.09238]; minaret [il-minaret-31.5283-35.10379] → minaret [il-minaret-31.5281-35.09238]; minaret [il-minaret-31.5283-35.10379] → minaret [il-minaret-31.5281-35.09238]; minaret [il-minaret-31.5283-35.10379] → minaret [il-minaret-31.5281-35.09238]; minaret [il-minaret-31.5283-35.10379] |
| الحاووز الثاني (il-31.5136-35.0781) | flat | minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.51592-35.08052] → minaret [il-minaret-31.51592-35.08052] → minaret [il-minaret-31.51592-35.08052] → minaret [il-minaret-31.51592-35.08052] | minaret [il-minaret-31.47742-35.06553]; minaret [il-minaret-31.51592-35.08052] → minaret [il-minaret-31.51592-35.08052] → minaret [il-minaret-31.51592-35.08052] → minaret [il-minaret-31.51592-35.08052] |
| الحاووز الاول (il-31.5246-35.0846) | flat | minaret [il-minaret-31.52318-35.08686] → minaret [il-minaret-31.52318-35.08686] → minaret [il-minaret-31.52318-35.08686] → minaret [il-minaret-31.52318-35.08686] | minaret [il-minaret-31.52318-35.08686] → minaret [il-minaret-31.52318-35.08686] → minaret [il-minaret-31.52318-35.08686] → minaret [il-minaret-31.52318-35.08686] |
| عيصى (il-31.5296-35.0804) | flat | minaret [il-minaret-31.52908-35.08078]; minaret [il-minaret-31.53042-35.09808]; minaret [il-minaret-31.54424-35.10733] → minaret [il-minaret-31.52908-35.08078] → minaret [il-minaret-31.52908-35.08078] → minaret [il-minaret-31.52908-35.08078] | minaret [il-minaret-31.52908-35.08078]; minaret [il-minaret-31.53042-35.09808]; minaret [il-minaret-31.54424-35.10733] → minaret [il-minaret-31.52908-35.08078] → minaret [il-minaret-31.52908-35.08078] → minaret [il-minaret-31.52908-35.08078] |
| الجًلَدة (il-31.5351-35.0829) | flat | minaret [il-minaret-31.53442-35.0866] → minaret [il-minaret-31.53442-35.0866] → minaret [il-minaret-31.53442-35.0866]; minaret [il-minaret-31.54969-35.10796] → minaret [il-minaret-31.53442-35.0866] | minaret [il-minaret-31.53442-35.0866] → minaret [il-minaret-31.53442-35.0866] → minaret [il-minaret-31.53442-35.0866]; minaret [il-minaret-31.54969-35.10796] → minaret [il-minaret-31.53442-35.0866] |
| תפוח (il-31.5382-35.0443) | flat | minaret [il-minaret-31.53858-35.04891] → minaret [il-minaret-31.53858-35.04891] → minaret [il-minaret-31.53858-35.04891] → minaret [il-minaret-31.53858-35.04891] | minaret [il-minaret-31.53858-35.04891] → minaret [il-minaret-31.53858-35.04891] → minaret [il-minaret-31.53858-35.04891] → minaret [il-minaret-31.53858-35.04891] |
| عين سارة (il-31.5385-35.0991) | flat | minaret [il-minaret-31.5367-35.09993] → minaret [il-minaret-31.5367-35.09993] → minaret [il-minaret-31.5367-35.09993] → minaret [il-minaret-31.5367-35.09993] | minaret [il-minaret-31.5367-35.09993] → minaret [il-minaret-31.5367-35.09993] → minaret [il-minaret-31.5367-35.09993] → minaret [il-minaret-31.5367-35.09993] |
| الحرس (il-31.5483-35.0974) | flat | minaret [il-minaret-31.52318-35.08686]; minaret [il-minaret-31.53186-35.10687]; minaret [il-minaret-31.54811-35.09698] → minaret [il-minaret-31.54811-35.09698] → minaret [il-minaret-31.54811-35.09698] → minaret [il-minaret-31.54811-35.09698] | minaret [il-minaret-31.52318-35.08686]; minaret [il-minaret-31.53186-35.10687]; minaret [il-minaret-31.54811-35.09698] → minaret [il-minaret-31.54811-35.09698] → minaret [il-minaret-31.54811-35.09698] → minaret [il-minaret-31.54811-35.09698] |
| University Neighborhood (il-31.5511-35.0928) | flat | minaret [il-minaret-31.52318-35.08686]; minaret [il-minaret-31.53042-35.09808]; minaret [il-minaret-31.54998-35.09131] → minaret [il-minaret-31.54998-35.09131] → minaret [il-minaret-31.54998-35.09131] → minaret [il-minaret-31.54998-35.09131] | minaret [il-minaret-31.52318-35.08686]; minaret [il-minaret-31.53042-35.09808]; minaret [il-minaret-31.54998-35.09131] → minaret [il-minaret-31.54998-35.09131] → minaret [il-minaret-31.54998-35.09131] → minaret [il-minaret-31.54998-35.09131] |
| Ras Al-Joura (il-31.5568-35.1005) | flat | minaret [il-minaret-31.53042-35.09808]; minaret [il-minaret-31.53186-35.10687]; minaret [il-minaret-31.55878-35.10004] → minaret [il-minaret-31.55878-35.10004] → minaret [il-minaret-31.55878-35.10004]; minaret [il-minaret-31.56784-35.07474] → minaret [il-minaret-31.55878-35.10004] | minaret [il-minaret-31.53042-35.09808]; minaret [il-minaret-31.53186-35.10687]; minaret [il-minaret-31.55878-35.10004] → minaret [il-minaret-31.55878-35.10004] → minaret [il-minaret-31.55878-35.10004]; minaret [il-minaret-31.56784-35.07474] → minaret [il-minaret-31.55878-35.10004] |
| קרית ארבע (il-31.5278-35.1192) | flat | minaret [il-minaret-31.53042-35.09808]; minaret [il-minaret-31.53186-35.10687]; synagogue [il-synagogue-31.53004-35.12048] → synagogue [il-synagogue-31.53004-35.12048] → synagogue [il-synagogue-31.53004-35.12048] → synagogue [il-synagogue-31.53004-35.12048] | minaret [il-minaret-31.53042-35.09808]; minaret [il-minaret-31.53186-35.10687]; synagogue [il-synagogue-31.53004-35.12048] → synagogue [il-synagogue-31.53004-35.12048] → synagogue [il-synagogue-31.53004-35.12048] → synagogue [il-synagogue-31.53004-35.12048] |
| חלחול (il-31.5775-35.0993) | flat | minaret [il-minaret-31.54532-35.10428]; minaret [il-minaret-31.5462-35.0906] → 0 → 0 → 0 | minaret [il-minaret-31.54532-35.10428]; minaret [il-minaret-31.5462-35.0906] → 0 → 0 → 0 |
| בית כאחיל (il-31.5709-35.0663) | flat | minaret [il-minaret-31.56951-35.06469]; minaret [il-minaret-31.57296-35.05512] → minaret [il-minaret-31.56951-35.06469]; minaret [il-minaret-31.57296-35.05512] → minaret [il-minaret-31.56951-35.06469]; minaret [il-minaret-31.57296-35.05512] → minaret [il-minaret-31.56951-35.06469]; minaret [il-minaret-31.57296-35.05512] | minaret [il-minaret-31.56951-35.06469]; minaret [il-minaret-31.57296-35.05512] → minaret [il-minaret-31.56951-35.06469]; minaret [il-minaret-31.57296-35.05512] → minaret [il-minaret-31.56951-35.06469]; minaret [il-minaret-31.57296-35.05512] → minaret [il-minaret-31.56951-35.06469]; minaret [il-minaret-31.57296-35.05512] |
| קלקאס (il-31.4932-35.0958) | flat | minaret [il-minaret-31.4918-35.0966] → minaret [il-minaret-31.4918-35.0966] → minaret [il-minaret-31.4918-35.0966] → minaret [il-minaret-31.4918-35.0966] | minaret [il-minaret-31.4918-35.0966] → minaret [il-minaret-31.4918-35.0966] → minaret [il-minaret-31.4918-35.0966] → minaret [il-minaret-31.4918-35.0966] |
| At-Tuba (il-31.4070-35.1757) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חוות מעון (il-31.4093-35.1604) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעון (il-31.4140-35.1629) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ח'רבת מעין (il-31.4112-35.1318) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| א-תוואני (il-31.4133-35.1533) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל כרמיל (il-31.4230-35.1325) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משק מן (il-31.4169-35.1770) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל פאקיר (il-31.4287-35.1939) | flat | minaret [il-minaret-31.43036-35.19268] → minaret [il-minaret-31.43036-35.19268] → minaret [il-minaret-31.43036-35.19268] → minaret [il-minaret-31.43036-35.19268] | minaret [il-minaret-31.43036-35.19268] → minaret [il-minaret-31.43036-35.19268] → minaret [il-minaret-31.43036-35.19268] → minaret [il-minaret-31.43036-35.19268] |
| أم الخير (il-31.4292-35.1854) | flat | minaret [il-minaret-31.42877-35.18574] → minaret [il-minaret-31.42877-35.18574] → minaret [il-minaret-31.42877-35.18574] → minaret [il-minaret-31.42877-35.18574] | minaret [il-minaret-31.42877-35.18574] → minaret [il-minaret-31.42877-35.18574] → minaret [il-minaret-31.42877-35.18574] → minaret [il-minaret-31.42877-35.18574] |
| כרמל (il-31.4309-35.1833) | flat | synagogue [il-synagogue-31.43126-35.18245] → synagogue [il-synagogue-31.43126-35.18245] → synagogue [il-synagogue-31.43126-35.18245] → synagogue [il-synagogue-31.43126-35.18245] | synagogue [il-synagogue-31.43126-35.18245] → synagogue [il-synagogue-31.43126-35.18245] → synagogue [il-synagogue-31.43126-35.18245] → synagogue [il-synagogue-31.43126-35.18245] |
| אום אל חיר (il-31.4324-35.1856) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| أم لصفة (il-31.4360-35.1561) | flat | minaret [il-minaret-31.4358-35.15824]; minaret [il-minaret-31.43918-35.1496] → minaret [il-minaret-31.4358-35.15824]; minaret [il-minaret-31.43918-35.1496] → minaret [il-minaret-31.4358-35.15824]; minaret [il-minaret-31.43918-35.1496] → minaret [il-minaret-31.4358-35.15824]; minaret [il-minaret-31.43918-35.1496] | minaret [il-minaret-31.4358-35.15824]; minaret [il-minaret-31.43918-35.1496] → minaret [il-minaret-31.4358-35.15824]; minaret [il-minaret-31.43918-35.1496] → minaret [il-minaret-31.4358-35.15824]; minaret [il-minaret-31.43918-35.1496] → minaret [il-minaret-31.4358-35.15824]; minaret [il-minaret-31.43918-35.1496] |
| אום דאראג' א-זווידין (il-31.4444-35.1986) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חוות מדבר חבר (il-31.4789-35.1650) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעלה חבר (il-31.4858-35.1651) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| النجادة (il-31.4076-35.2119) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבים (il-31.5067-34.5992) | flat | minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 | minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 |
| שדרות (il-31.5265-34.5970) | flat | minaret [il-minaret-31.54784-34.45576]; synagogue [il-synagogue-31.52363-34.59625]; synagogue [il-synagogue-31.52979-34.58649] → synagogue [il-synagogue-31.52363-34.59625]; synagogue [il-synagogue-31.52979-34.58649] → synagogue [il-synagogue-31.52363-34.59625]; synagogue [il-synagogue-31.52979-34.58649] → synagogue [il-synagogue-31.52363-34.59625]; synagogue [il-synagogue-31.52979-34.58649] | minaret [il-minaret-31.54784-34.45576]; synagogue [il-synagogue-31.52363-34.59625]; synagogue [il-synagogue-31.52979-34.58649] → synagogue [il-synagogue-31.52363-34.59625]; synagogue [il-synagogue-31.52979-34.58649] → synagogue [il-synagogue-31.52363-34.59625]; synagogue [il-synagogue-31.52979-34.58649] → synagogue [il-synagogue-31.52363-34.59625]; synagogue [il-synagogue-31.52979-34.58649] |
| ניר עם (il-31.5193-34.5808) | flat | minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 | minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 |
| איבים (il-31.5333-34.6101) | flat | minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.54784-34.45576]; synagogue [il-synagogue-31.52233-34.59321] → 0 → 0 → 0 | minaret [il-minaret-31.50416-34.46902]; minaret [il-minaret-31.54784-34.45576]; synagogue [il-synagogue-31.52233-34.59321] → 0 → 0 → 0 |
| נתיב העשרה (il-31.5717-34.5395) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אור הנר (il-31.5576-34.6001) | flat | minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 | minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 |
| ארז (il-31.5605-34.5666) | flat | minaret [il-minaret-31.508-34.46334]; minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 | minaret [il-minaret-31.508-34.46334]; minaret [il-minaret-31.54784-34.45576] → 0 → 0 → 0 |
| יד מרדכי (il-31.5887-34.5590) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דורות (il-31.5066-34.6460) | flat | minaret [il-minaret-31.50416-34.46902] → 0 → 0 → 0 | minaret [il-minaret-31.50416-34.46902] → 0 → 0 → 0 |
| ברור חיל (il-31.5581-34.6477) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תלמים (il-31.5636-34.6721) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חלץ (il-31.5774-34.6575) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה דוד (il-31.5766-34.6846) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גברעם (il-31.5909-34.6115) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אחוזם (il-31.5522-34.7707) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נועם (il-31.5669-34.7891) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שלווה (il-31.5635-34.7680) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבן שמואל (il-31.5749-34.7643) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| איתן (il-31.5728-34.7487) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קריית גת (il-31.6094-34.7712) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עוזה (il-31.5925-34.7649) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| לכיש (il-31.5609-34.8411) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שקף (il-31.5157-34.9378) | flat | 0 → 0 → synagogue [il-synagogue-31.51744-34.92135] → 0 | 0 → 0 → synagogue [il-synagogue-31.51744-34.92135] → 0 |
| דיר סאמת (il-31.5212-34.9729) | flat | minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.52284-34.97302] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.52284-34.97302] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.52284-34.97302] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.52284-34.97302] | minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.52284-34.97302] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.52284-34.97302] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.52284-34.97302] → minaret [il-minaret-31.5039-34.96679]; minaret [il-minaret-31.52284-34.97302] |
| אידנא (il-31.5580-34.9763) | flat | minaret [il-minaret-31.53281-34.96431]; minaret [il-minaret-31.53441-34.96947]; minaret [il-minaret-31.55719-34.9737]; minaret [il-minaret-31.55842-34.9769] → minaret [il-minaret-31.55719-34.9737]; minaret [il-minaret-31.55842-34.9769] → minaret [il-minaret-31.55719-34.9737]; minaret [il-minaret-31.55842-34.9769] → minaret [il-minaret-31.55719-34.9737]; minaret [il-minaret-31.55842-34.9769] | minaret [il-minaret-31.53281-34.96431]; minaret [il-minaret-31.53441-34.96947]; minaret [il-minaret-31.55719-34.9737]; minaret [il-minaret-31.55842-34.9769] → minaret [il-minaret-31.55719-34.9737]; minaret [il-minaret-31.55842-34.9769] → minaret [il-minaret-31.55719-34.9737]; minaret [il-minaret-31.55842-34.9769] → minaret [il-minaret-31.55719-34.9737]; minaret [il-minaret-31.55842-34.9769] |
| בני דקלים (il-31.5175-34.9199) | flat | synagogue [il-synagogue-31.51744-34.92135] → synagogue [il-synagogue-31.51744-34.92135] → synagogue [il-synagogue-31.51744-34.92135] → synagogue [il-synagogue-31.51744-34.92135] | synagogue [il-synagogue-31.51744-34.92135] → synagogue [il-synagogue-31.51744-34.92135] → synagogue [il-synagogue-31.51744-34.92135] → synagogue [il-synagogue-31.51744-34.92135] |
| אליאב (il-31.5299-34.9315) | flat | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 |
| אמציה (il-31.5325-34.9143) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כרמי קטיף (il-31.5372-34.9127) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תרקומייה (il-31.5753-35.0089) | flat | minaret [il-minaret-31.56612-34.96841]; minaret [il-minaret-31.57512-35.01173] → minaret [il-minaret-31.57512-35.01173] → minaret [il-minaret-31.57512-35.01173] → minaret [il-minaret-31.57512-35.01173] | minaret [il-minaret-31.56612-34.96841]; minaret [il-minaret-31.57512-35.01173] → minaret [il-minaret-31.57512-35.01173] → minaret [il-minaret-31.57512-35.01173] → minaret [il-minaret-31.57512-35.01173] |
| אדורה (il-31.5519-35.0165) | flat | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 |
| תלם (il-31.5635-35.0310) | flat | synagogue [il-synagogue-31.56196-35.03256] → synagogue [il-synagogue-31.56196-35.03256] → synagogue [il-synagogue-31.56196-35.03256] → synagogue [il-synagogue-31.56196-35.03256] | synagogue [il-synagogue-31.56196-35.03256] → synagogue [il-synagogue-31.56196-35.03256] → synagogue [il-synagogue-31.56196-35.03256] → synagogue [il-synagogue-31.56196-35.03256] |
| בית אולא (il-31.5968-35.0285) | flat | minaret [il-minaret-31.59672-35.02981]; minaret [il-minaret-31.6003-35.01903] → minaret [il-minaret-31.59672-35.02981]; minaret [il-minaret-31.6003-35.01903] → minaret [il-minaret-31.59672-35.02981]; minaret [il-minaret-31.6003-35.01903] → minaret [il-minaret-31.59672-35.02981]; minaret [il-minaret-31.6003-35.01903] | minaret [il-minaret-31.59672-35.02981]; minaret [il-minaret-31.6003-35.01903] → minaret [il-minaret-31.59672-35.02981]; minaret [il-minaret-31.6003-35.01903] → minaret [il-minaret-31.59672-35.02981]; minaret [il-minaret-31.6003-35.01903] → minaret [il-minaret-31.59672-35.02981]; minaret [il-minaret-31.6003-35.01903] |
| בקר (il-31.6069-35.0776) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ח'אראס (il-31.6140-35.0418) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נובא (il-31.6066-35.0365) | flat | minaret [il-minaret-31.60718-35.03656]; minaret [il-minaret-31.61022-35.03343]; minaret [il-minaret-31.61066-35.02684] → minaret [il-minaret-31.60718-35.03656]; minaret [il-minaret-31.61022-35.03343]; minaret [il-minaret-31.61066-35.02684] → minaret [il-minaret-31.60718-35.03656]; minaret [il-minaret-31.61022-35.03343]; minaret [il-minaret-31.61066-35.02684] → minaret [il-minaret-31.60718-35.03656]; minaret [il-minaret-31.61022-35.03343]; minaret [il-minaret-31.61066-35.02684] | minaret [il-minaret-31.60718-35.03656]; minaret [il-minaret-31.61022-35.03343]; minaret [il-minaret-31.61066-35.02684] → minaret [il-minaret-31.60718-35.03656]; minaret [il-minaret-31.61022-35.03343]; minaret [il-minaret-31.61066-35.02684] → minaret [il-minaret-31.60718-35.03656]; minaret [il-minaret-31.61022-35.03343]; minaret [il-minaret-31.61066-35.02684] → minaret [il-minaret-31.60718-35.03656]; minaret [il-minaret-31.61022-35.03343]; minaret [il-minaret-31.61066-35.02684] |
| חתא (il-31.6202-35.0213) | flat | minaret [il-minaret-31.62309-35.02945] → minaret [il-minaret-31.62309-35.02945] → minaret [il-minaret-31.62309-35.02945] → minaret [il-minaret-31.62309-35.02945] | minaret [il-minaret-31.62309-35.02945] → minaret [il-minaret-31.62309-35.02945] → minaret [il-minaret-31.62309-35.02945] → minaret [il-minaret-31.62309-35.02945] |
| בני נעים (il-31.5169-35.1630) | flat | minaret [il-minaret-31.51715-35.16517] → minaret [il-minaret-31.51715-35.16517] → minaret [il-minaret-31.51715-35.16517] → minaret [il-minaret-31.51715-35.16517] | minaret [il-minaret-31.51715-35.16517] → minaret [il-minaret-31.51715-35.16517] → minaret [il-minaret-31.51715-35.16517] → minaret [il-minaret-31.51715-35.16517] |
| אל עודיסה (il-31.5269-35.1433) | flat | minaret [il-minaret-31.52019-35.16165] → 0 → 0 → 0 | minaret [il-minaret-31.52019-35.16165] → 0 → 0 → 0 |
| Al-Uddeisa (il-31.5428-35.1427) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| الدوّارة (il-31.5573-35.1432) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אלשיוח' (il-31.5769-35.1507) | flat | minaret [il-minaret-31.57797-35.14987] → minaret [il-minaret-31.57797-35.14987] → minaret [il-minaret-31.57797-35.14987] → minaret [il-minaret-31.57797-35.14987] | minaret [il-minaret-31.57797-35.14987] → minaret [il-minaret-31.57797-35.14987] → minaret [il-minaret-31.57797-35.14987] → minaret [il-minaret-31.57797-35.14987] |
| סעיר (il-31.5829-35.1452) | flat | minaret [il-minaret-31.58348-35.14383]; minaret [il-minaret-31.58694-35.14753] → minaret [il-minaret-31.58348-35.14383]; minaret [il-minaret-31.58694-35.14753] → minaret [il-minaret-31.58348-35.14383]; minaret [il-minaret-31.58694-35.14753] → minaret [il-minaret-31.58348-35.14383]; minaret [il-minaret-31.58694-35.14753] | minaret [il-minaret-31.58348-35.14383]; minaret [il-minaret-31.58694-35.14753] → minaret [il-minaret-31.58348-35.14383]; minaret [il-minaret-31.58694-35.14753] → minaret [il-minaret-31.58348-35.14383]; minaret [il-minaret-31.58694-35.14753] → minaret [il-minaret-31.58348-35.14383]; minaret [il-minaret-31.58694-35.14753] |
| מיצד (il-31.5859-35.1878) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פני קדם (il-31.5893-35.1957) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ערב א-רשיידה (il-31.5703-35.2307) | flat | minaret [il-minaret-31.5283-35.10379]; minaret [il-minaret-31.56896-35.23162] → minaret [il-minaret-31.56896-35.23162] → minaret [il-minaret-31.56896-35.23162] → minaret [il-minaret-31.56896-35.23162] | minaret [il-minaret-31.5283-35.10379]; minaret [il-minaret-31.56896-35.23162] → minaret [il-minaret-31.56896-35.23162] → minaret [il-minaret-31.56896-35.23162] → minaret [il-minaret-31.56896-35.23162] |
| מעלה עמוס (il-31.5969-35.2285) | flat | synagogue [il-synagogue-31.59717-35.22827] → synagogue [il-synagogue-31.59717-35.22827] → synagogue [il-synagogue-31.59717-35.22827] → synagogue [il-synagogue-31.59717-35.22827] | synagogue [il-synagogue-31.59717-35.22827] → synagogue [il-synagogue-31.59717-35.22827] → synagogue [il-synagogue-31.59717-35.22827] → synagogue [il-synagogue-31.59717-35.22827] |
| חאן ערוגות (il-31.5987-35.2167) | flat | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 | minaret [il-minaret-31.5283-35.10379] → 0 → 0 → 0 |
| מצפה שלם (il-31.5697-35.4007) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מצוקי דרגות (il-31.5909-35.3933) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כרמיה (il-31.6054-34.5430) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זיקים (il-31.6094-34.5222) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מבקיעים (il-31.6222-34.5771) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית שיקמה (il-31.6375-34.6105) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בת הדר (il-31.6465-34.5960) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אשקלון (il-31.6654-34.5650) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| באר גנים (il-31.7001-34.6106) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תלמי יפה (il-31.6169-34.6133) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כוכב מיכאל (il-31.6275-34.6671) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נוגה (il-31.6252-34.6953) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נהורה (il-31.6227-34.7047) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עוצם (il-31.6366-34.7026) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה יואב (il-31.6457-34.6770) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משען (il-31.6576-34.6238) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ברכיה (il-31.6678-34.6268) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נגבה (il-31.6623-34.6827) | flat | synagogue [il-synagogue-31.65666-34.68358] → synagogue [il-synagogue-31.65666-34.68358] → synagogue [il-synagogue-31.65666-34.68358] → synagogue [il-synagogue-31.65666-34.68358] | synagogue [il-synagogue-31.65666-34.68358] → synagogue [il-synagogue-31.65666-34.68358] → synagogue [il-synagogue-31.65666-34.68358] → synagogue [il-synagogue-31.65666-34.68358] |
| הודיה (il-31.6757-34.6398) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניר ישראל (il-31.6873-34.6364) | flat | 0 → 0 → synagogue [il-synagogue-31.69894-34.60945] → 0 | 0 → 0 → synagogue [il-synagogue-31.69894-34.60945] → 0 |
| משואות יצחק (il-31.7023-34.6899) | flat | synagogue [il-synagogue-31.70272-34.68863] → synagogue [il-synagogue-31.70272-34.68863] → synagogue [il-synagogue-31.70272-34.68863] → synagogue [il-synagogue-31.70272-34.68863] | synagogue [il-synagogue-31.70272-34.68863] → synagogue [il-synagogue-31.70272-34.68863] → synagogue [il-synagogue-31.70272-34.68863] → synagogue [il-synagogue-31.70272-34.68863] |
| ניר ח״ן (il-31.6084-34.7145) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה משה (il-31.6102-34.8027) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שחר (il-31.6184-34.7241) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גת (il-31.6269-34.7951) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יד נתן (il-31.6529-34.7055) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רווחה (il-31.6495-34.7317) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אלומה (il-31.6520-34.7427) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מנוחה (il-31.6565-34.7767) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ורדון (il-31.6635-34.7822) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סגולה (il-31.6697-34.7792) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זבדיאל (il-31.6584-34.7597) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נחלה (il-31.6580-34.7950) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קוממיות (il-31.6620-34.7298) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניר בנים (il-31.6717-34.7542) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זרחיה (il-31.6807-34.7455) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מרכז שפירא (il-31.6952-34.7071) | flat | synagogue [il-synagogue-31.69466-34.70883] → synagogue [il-synagogue-31.69466-34.70883] → synagogue [il-synagogue-31.69466-34.70883] → synagogue [il-synagogue-31.69466-34.70883] | synagogue [il-synagogue-31.69466-34.70883] → synagogue [il-synagogue-31.69466-34.70883] → synagogue [il-synagogue-31.69466-34.70883] → synagogue [il-synagogue-31.69466-34.70883] |
| עין צורים (il-31.6941-34.7201) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שפיר (il-31.6971-34.7284) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קדמה (il-31.7007-34.7751) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית גוברין (il-31.6123-34.8964) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גלאון (il-31.6341-34.8490) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית ניר (il-31.6473-34.8741) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| לוזית (il-31.6878-34.8877) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר זוהרים (il-31.6217-34.9249) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נחושה (il-31.6288-34.9523) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אדרת (il-31.6597-34.9957) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| צפרירים (il-31.6600-34.9444) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת ישעיהו (il-31.6702-34.9463) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שריגים (לי־און) (il-31.6770-34.9358) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נתיב הל"ה (il-31.6886-34.9823) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עגור (il-31.6971-34.9129) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית שמש (il-31.7462-34.9887) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זנוח (il-31.7316-35.0007) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מחסיה (il-31.7482-35.0074) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נחם (il-31.7666-35.0040) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צרעה (il-31.7627-34.9686) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית אומר (il-31.6210-35.1031) | flat | minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62053-35.10243] → minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62053-35.10243] → minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62053-35.10243] → minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62053-35.10243] | minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62053-35.10243] → minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62053-35.10243] → minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62053-35.10243] → minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62053-35.10243] |
| חירבת אל מנטרה (il-31.6333-35.0976) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג'אלא (il-31.6219-35.0716) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| סוריף (il-31.6504-35.0641) | flat | minaret [il-minaret-31.61622-35.03323]; minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499]; minaret [il-minaret-31.6518-35.06399] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499]; minaret [il-minaret-31.6518-35.06399] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499]; minaret [il-minaret-31.6518-35.06399] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499]; minaret [il-minaret-31.6518-35.06399] | minaret [il-minaret-31.61622-35.03323]; minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499]; minaret [il-minaret-31.6518-35.06399] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499]; minaret [il-minaret-31.6518-35.06399] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499]; minaret [il-minaret-31.6518-35.06399] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499]; minaret [il-minaret-31.6518-35.06399] |
| الظهر (il-31.6466-35.0646) | flat | minaret [il-minaret-31.61622-35.03323]; minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499] | minaret [il-minaret-31.61622-35.03323]; minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499] → minaret [il-minaret-31.6336-35.07937]; minaret [il-minaret-31.64861-35.06499] |
| السرج (il-31.6462-35.0740) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| القرنة (il-31.6516-35.0703) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| الضاحية الشمالية (il-31.6543-35.0739) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| القرينات وضاحية القندول (il-31.6531-35.0825) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| Al-Baka'a (il-31.6553-35.0614) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| الثغرة (il-31.6575-35.0687) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| الضاحية الجنوبية (il-31.6381-35.0576) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| علي غنيم (il-31.6589-35.0787) | flat | synagogue [il-synagogue-31.64659-35.14331] → synagogue [il-synagogue-31.6483-35.11608] → synagogue [il-synagogue-31.6483-35.11608] → 0 | synagogue [il-synagogue-31.64659-35.14331] → synagogue [il-synagogue-31.6483-35.11608] → synagogue [il-synagogue-31.6483-35.11608] → 0 |
| قرية دير موسى (il-31.6642-35.0663) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| אל-ג'בעה (il-31.6748-35.0784) | flat | minaret [il-minaret-31.70454-35.2054] → 0 → 0 → 0 | minaret [il-minaret-31.70454-35.2054] → 0 → 0 → 0 |
| ضاحية الزيتون - الصوانة (il-31.6429-35.0478) | flat | minaret [il-minaret-31.61622-35.03323]; synagogue [il-synagogue-31.64659-35.14331] → 0 → minaret [il-minaret-31.64861-35.06499] → 0 | minaret [il-minaret-31.61622-35.03323]; synagogue [il-synagogue-31.64659-35.14331] → 0 → minaret [il-minaret-31.64861-35.06499] → minaret [il-minaret-31.64861-35.06499] |
| צוריף (il-31.6533-35.0469) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| סאפה (il-31.6433-35.0993) | flat | 0 → 0 → synagogue [il-synagogue-31.6483-35.11608] → 0 | 0 → 0 → synagogue [il-synagogue-31.6483-35.11608] → 0 |
| ח'ירבת א-דאר (il-31.6556-35.0260) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| גבעות עדן (il-31.6606-35.0157) | flat | minaret [il-minaret-31.62309-35.02945]; synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 | minaret [il-minaret-31.62309-35.02945]; synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → 0 |
| בת עין (il-31.6573-35.1032) | flat | synagogue [il-synagogue-31.65499-35.10587] → synagogue [il-synagogue-31.65326-35.12674]; synagogue [il-synagogue-31.65499-35.10587] → synagogue [il-synagogue-31.65326-35.12674]; synagogue [il-synagogue-31.65499-35.10587]; synagogue [il-synagogue-31.65729-35.12548] → synagogue [il-synagogue-31.65499-35.10587]; synagogue [il-synagogue-31.65729-35.12548] | synagogue [il-synagogue-31.65499-35.10587] → synagogue [il-synagogue-31.65326-35.12674]; synagogue [il-synagogue-31.65499-35.10587] → synagogue [il-synagogue-31.65326-35.12674]; synagogue [il-synagogue-31.65499-35.10587]; synagogue [il-synagogue-31.65729-35.12548] → synagogue [il-synagogue-31.65499-35.10587]; synagogue [il-synagogue-31.65729-35.12548] |
| כפר עציון (il-31.6487-35.1150) | flat | synagogue [il-synagogue-31.6483-35.11608] → synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6483-35.11608] → synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6483-35.11608]; synagogue [il-synagogue-31.65326-35.12674] → synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6483-35.11608] | synagogue [il-synagogue-31.6483-35.11608] → synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6483-35.11608] → synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6483-35.11608]; synagogue [il-synagogue-31.65326-35.12674] → synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6483-35.11608] |
| אלון שבות (il-31.6549-35.1268) | flat | minaret [il-minaret-31.62633-35.148]; synagogue [il-synagogue-31.65326-35.12674] → synagogue [il-synagogue-31.65326-35.12674] → synagogue [il-synagogue-31.65326-35.12674]; synagogue [il-synagogue-31.65685-35.15055] → synagogue [il-synagogue-31.65326-35.12674] | minaret [il-minaret-31.62633-35.148]; synagogue [il-synagogue-31.65326-35.12674] → synagogue [il-synagogue-31.65326-35.12674] → synagogue [il-synagogue-31.65326-35.12674]; synagogue [il-synagogue-31.65685-35.15055] → synagogue [il-synagogue-31.65326-35.12674] |
| גבעות (il-31.6790-35.1011) | flat | minaret [il-minaret-31.70454-35.2054] → synagogue [il-synagogue-31.65729-35.12548] → synagogue [il-synagogue-31.65729-35.12548] → 0 | minaret [il-minaret-31.70454-35.2054] → synagogue [il-synagogue-31.65729-35.12548] → synagogue [il-synagogue-31.65729-35.12548] → 0 |
| ביתר עילית (il-31.6989-35.1137) | flat | minaret [il-minaret-31.70454-35.2054]; synagogue [il-synagogue-31.70078-35.11481] → synagogue [il-synagogue-31.70078-35.11481] → synagogue [il-synagogue-31.70078-35.11481] → synagogue [il-synagogue-31.70078-35.11481] | minaret [il-minaret-31.70454-35.2054]; synagogue [il-synagogue-31.70078-35.11481] → synagogue [il-synagogue-31.70078-35.11481] → synagogue [il-synagogue-31.70078-35.11481] → synagogue [il-synagogue-31.70078-35.11481] |
| ואדי פוקין (il-31.7074-35.1035) | flat | minaret [il-minaret-31.70454-35.2054]; synagogue [il-synagogue-31.71261-35.09982] → synagogue [il-synagogue-31.71261-35.09982] → synagogue [il-synagogue-31.71261-35.09982] → synagogue [il-synagogue-31.71261-35.09982] | minaret [il-minaret-31.70454-35.2054]; synagogue [il-synagogue-31.71261-35.09982] → synagogue [il-synagogue-31.71261-35.09982] → synagogue [il-synagogue-31.71261-35.09982] → synagogue [il-synagogue-31.71261-35.09982] |
| הדר ביתר (il-31.7078-35.1114) | flat | minaret [il-minaret-31.70454-35.2054]; synagogue [il-synagogue-31.70376-35.11433] → synagogue [il-synagogue-31.70376-35.11433] → synagogue [il-synagogue-31.70376-35.11433] → synagogue [il-synagogue-31.70376-35.11433] | minaret [il-minaret-31.70454-35.2054]; synagogue [il-synagogue-31.70376-35.11433] → synagogue [il-synagogue-31.70376-35.11433] → synagogue [il-synagogue-31.70376-35.11433] → synagogue [il-synagogue-31.70376-35.11433] |
| צור הדסה (il-31.7157-35.0948) | flat | synagogue [il-synagogue-31.71261-35.09982] → minaret [il-minaret-31.71125-35.13354]; synagogue [il-synagogue-31.71261-35.09982] → minaret [il-minaret-31.71125-35.13354]; synagogue [il-synagogue-31.71261-35.09982] → synagogue [il-synagogue-31.71261-35.09982] | synagogue [il-synagogue-31.71261-35.09982] → minaret [il-minaret-31.71125-35.13354]; synagogue [il-synagogue-31.70376-35.11433]; synagogue [il-synagogue-31.71261-35.09982] → minaret [il-minaret-31.71125-35.13354]; synagogue [il-synagogue-31.70376-35.11433]; synagogue [il-synagogue-31.71261-35.09982] → synagogue [il-synagogue-31.70376-35.11433]; synagogue [il-synagogue-31.71261-35.09982] |
| מבוא ביתר (il-31.7227-35.1071) | flat | 0 → 0 → minaret [il-minaret-31.72755-35.13614] → minaret [il-minaret-31.72755-35.13614] | 0 → 0 → minaret [il-minaret-31.72755-35.13614] → minaret [il-minaret-31.72755-35.13614] |
| נחאלין (il-31.6853-35.1193) | flat | minaret [il-minaret-31.68359-35.11739]; minaret [il-minaret-31.70454-35.2054] → minaret [il-minaret-31.68359-35.11739] → minaret [il-minaret-31.68359-35.11739] → minaret [il-minaret-31.68359-35.11739] | minaret [il-minaret-31.68359-35.11739]; minaret [il-minaret-31.70454-35.2054] → minaret [il-minaret-31.68359-35.11739] → minaret [il-minaret-31.68359-35.11739]; synagogue [il-synagogue-31.69138-35.10618] → minaret [il-minaret-31.68359-35.11739] |
| האתרוג (il-31.6971-35.1236) | flat | minaret [il-minaret-31.70454-35.2054]; synagogue [il-synagogue-31.69655-35.11987] → synagogue [il-synagogue-31.69655-35.11987] → synagogue [il-synagogue-31.69655-35.11987] → synagogue [il-synagogue-31.69655-35.11987] | minaret [il-minaret-31.70454-35.2054]; synagogue [il-synagogue-31.69655-35.11987] → synagogue [il-synagogue-31.69655-35.11987] → minaret [il-minaret-31.70353-35.16172]; synagogue [il-synagogue-31.69655-35.11987] → synagogue [il-synagogue-31.69655-35.11987] |
| חוסאן (il-31.7080-35.1356) | flat | minaret [il-minaret-31.69435-35.18346]; minaret [il-minaret-31.70155-35.1838]; minaret [il-minaret-31.70454-35.2054]; minaret [il-minaret-31.71125-35.13354] → minaret [il-minaret-31.71125-35.13354] → minaret [il-minaret-31.71125-35.13354]; synagogue [il-synagogue-31.70175-35.10747] → minaret [il-minaret-31.71125-35.13354]; synagogue [il-synagogue-31.70175-35.10747] | minaret [il-minaret-31.69435-35.18346]; minaret [il-minaret-31.70155-35.1838]; minaret [il-minaret-31.70454-35.2054]; minaret [il-minaret-31.71125-35.13354] → minaret [il-minaret-31.71125-35.13354] → minaret [il-minaret-31.71125-35.13354]; synagogue [il-synagogue-31.70175-35.10747] → minaret [il-minaret-31.71125-35.13354]; synagogue [il-synagogue-31.70175-35.10747] |
| בתיר (il-31.7254-35.1354) | flat | minaret [il-minaret-31.69949-35.17536]; minaret [il-minaret-31.70353-35.16172]; minaret [il-minaret-31.71868-35.14158] → minaret [il-minaret-31.71868-35.14158] → minaret [il-minaret-31.71868-35.14158] → minaret [il-minaret-31.71868-35.14158] | minaret [il-minaret-31.69949-35.17536]; minaret [il-minaret-31.70353-35.16172]; minaret [il-minaret-31.71868-35.14158] → minaret [il-minaret-31.71868-35.14158] → minaret [il-minaret-31.71868-35.14158] → minaret [il-minaret-31.71868-35.14158] |
| אל-ח'דר (il-31.6947-35.1668) | flat | minaret [il-minaret-31.69742-35.16368]; minaret [il-minaret-31.71439-35.20141] → minaret [il-minaret-31.69742-35.16368] → minaret [il-minaret-31.69742-35.16368] → minaret [il-minaret-31.69742-35.16368] | minaret [il-minaret-31.69742-35.16368]; minaret [il-minaret-31.71439-35.20141] → minaret [il-minaret-31.69742-35.16368] → minaret [il-minaret-31.69742-35.16368] → minaret [il-minaret-31.69742-35.16368] |
| בר כוכבא (il-31.7135-35.1532) | flat | minaret [il-minaret-31.69435-35.18346]; minaret [il-minaret-31.69949-35.17536] → 0 → 0 → 0 | minaret [il-minaret-31.69435-35.18346]; minaret [il-minaret-31.69949-35.17536] → 0 → 0 → 0 |
| א-דוחה (il-31.7009-35.1800) | flat | minaret [il-minaret-31.69742-35.17959]; minaret [il-minaret-31.70696-35.19586] → minaret [il-minaret-31.69742-35.17959] → minaret [il-minaret-31.69742-35.16368]; minaret [il-minaret-31.69742-35.17959]; minaret [il-minaret-31.70353-35.16172] → minaret [il-minaret-31.69742-35.17959] | minaret [il-minaret-31.69742-35.17959]; minaret [il-minaret-31.70696-35.19586] → minaret [il-minaret-31.69742-35.17959] → minaret [il-minaret-31.69742-35.16368]; minaret [il-minaret-31.69742-35.17959]; minaret [il-minaret-31.70353-35.16172] → minaret [il-minaret-31.69742-35.17959] |
| בית ג'אלה (il-31.7155-35.1874) | flat | minaret [il-minaret-31.70314-35.21931]; minaret [il-minaret-31.71439-35.20141]; minaret [il-minaret-31.7163-35.1862] → minaret [il-minaret-31.70353-35.16172]; minaret [il-minaret-31.7163-35.1862] → minaret [il-minaret-31.7163-35.1862]; minaret [il-minaret-31.71968-35.19523]; minaret [il-minaret-31.72006-35.1991] → minaret [il-minaret-31.7163-35.1862] | minaret [il-minaret-31.70314-35.21931]; minaret [il-minaret-31.71439-35.20141]; minaret [il-minaret-31.7163-35.1862] → minaret [il-minaret-31.70353-35.16172]; minaret [il-minaret-31.7163-35.1862] → minaret [il-minaret-31.7163-35.1862]; minaret [il-minaret-31.71968-35.19523]; minaret [il-minaret-31.72006-35.1991] → minaret [il-minaret-31.70353-35.16172]; minaret [il-minaret-31.7163-35.1862] |
| הר גילה (il-31.7218-35.1715) | flat | minaret [il-minaret-31.70696-35.19586] → 0 → 0 → 0 | minaret [il-minaret-31.70696-35.19586] → 0 → 0 → 0 |
| ארטאס (il-31.6906-35.1875) | flat | minaret [il-minaret-31.68863-35.18613]; minaret [il-minaret-31.70314-35.21931] → minaret [il-minaret-31.68863-35.18613] → minaret [il-minaret-31.68863-35.18613]; minaret [il-minaret-31.69742-35.16368] → minaret [il-minaret-31.68863-35.18613] | minaret [il-minaret-31.68863-35.18613]; minaret [il-minaret-31.70314-35.21931] → minaret [il-minaret-31.68863-35.18613] → minaret [il-minaret-31.68863-35.18613]; minaret [il-minaret-31.69742-35.16368] → minaret [il-minaret-31.68863-35.18613] |
| אל-וולג'ה (il-31.7307-35.1614) | flat | church [il-church-31.71446-35.189]; minaret [il-minaret-31.70696-35.19586]; minaret [il-minaret-31.72006-35.1991]; minaret [il-minaret-31.72789-35.16761] → minaret [il-minaret-31.72789-35.16761] → minaret [il-minaret-31.72789-35.16761]; synagogue [il-synagogue-31.73415-35.18973] → minaret [il-minaret-31.72789-35.16761] | church [il-church-31.71446-35.189]; minaret [il-minaret-31.70696-35.19586]; minaret [il-minaret-31.72006-35.1991]; minaret [il-minaret-31.72789-35.16761] → minaret [il-minaret-31.72789-35.16761] → minaret [il-minaret-31.72789-35.16761]; synagogue [il-synagogue-31.73415-35.18973] → minaret [il-minaret-31.72789-35.16761] |
| ביר עונה (il-31.7204-35.1901) | flat | 0 → 0 → minaret [il-minaret-31.72006-35.1991] → minaret [il-minaret-31.72006-35.1991] | 0 → 0 → minaret [il-minaret-31.72006-35.1991] → minaret [il-minaret-31.72006-35.1991] |
| ח'לת חמאמה (il-31.7205-35.1948) | flat | minaret [il-minaret-31.71968-35.19523] → minaret [il-minaret-31.71968-35.19523] → minaret [il-minaret-31.71968-35.19523]; minaret [il-minaret-31.72006-35.1991] → minaret [il-minaret-31.71968-35.19523]; minaret [il-minaret-31.72006-35.1991] | minaret [il-minaret-31.71968-35.19523] → minaret [il-minaret-31.71968-35.19523] → minaret [il-minaret-31.71968-35.19523]; minaret [il-minaret-31.72006-35.1991] → minaret [il-minaret-31.71968-35.19523]; minaret [il-minaret-31.72006-35.1991] |
| חוות העיטם (il-31.6751-35.1904) | flat | 0 → minaret [il-minaret-31.66558-35.16824] → minaret [il-minaret-31.66558-35.16824] → 0 | 0 → minaret [il-minaret-31.66558-35.16824] → minaret [il-minaret-31.66558-35.16824] → 0 |
| רמת רחל (il-31.7387-35.2183) | flat | church [il-church-31.70494-35.20429] → 0 → 0 → 0 | church [il-church-31.70494-35.20429] → 0 → 0 → 0 |
| אל-ביידא (il-31.6705-35.1810) | flat | minaret [il-minaret-31.67065-35.18004] → minaret [il-minaret-31.67065-35.18004] → minaret [il-minaret-31.66558-35.16824]; minaret [il-minaret-31.67065-35.18004] → minaret [il-minaret-31.67065-35.18004] | minaret [il-minaret-31.67065-35.18004] → minaret [il-minaret-31.67065-35.18004] → minaret [il-minaret-31.66558-35.16824]; minaret [il-minaret-31.67065-35.18004] → minaret [il-minaret-31.67065-35.18004] |
| בית סאחור (il-31.7021-35.2297) | flat | church [il-church-31.70456-35.20766]; church [il-church-31.70494-35.20429]; minaret [il-minaret-31.70314-35.21931] → minaret [il-minaret-31.70314-35.21931] → minaret [il-minaret-31.70314-35.21931]; minaret [il-minaret-31.70459-35.25571] → minaret [il-minaret-31.70314-35.21931] | church [il-church-31.70456-35.20766]; church [il-church-31.70494-35.20429]; minaret [il-minaret-31.70314-35.21931] → minaret [il-minaret-31.70314-35.21931] → minaret [il-minaret-31.70314-35.21931]; minaret [il-minaret-31.70459-35.25571] → minaret [il-minaret-31.70314-35.21931] |
| אל-תרבה (il-31.6638-35.1789) | flat | minaret [il-minaret-31.66359-35.17735] → minaret [il-minaret-31.66359-35.17735] → minaret [il-minaret-31.66359-35.17735]; minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66968-35.16324] → minaret [il-minaret-31.66359-35.17735] | minaret [il-minaret-31.66359-35.17735] → minaret [il-minaret-31.66359-35.17735] → minaret [il-minaret-31.66359-35.17735]; minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66968-35.16324] → minaret [il-minaret-31.66359-35.17735] |
| ואדי רחאל (il-31.6673-35.1704) | flat | minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66968-35.16324] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66026-35.15226]; synagogue [il-synagogue-31.66968-35.16324] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66026-35.15226]; synagogue [il-synagogue-31.66968-35.16324] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66026-35.15226]; synagogue [il-synagogue-31.66968-35.16324] | minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66968-35.16324] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66026-35.15226]; synagogue [il-synagogue-31.66968-35.16324] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66026-35.15226]; synagogue [il-synagogue-31.66968-35.16324] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.66026-35.15226]; synagogue [il-synagogue-31.66968-35.16324] |
| מוצא (il-31.7928-35.1685) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אפרת (il-31.6536-35.1509) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אורה (il-31.7527-35.1535) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ואדי א-ניס (il-31.6541-35.1613) | flat | minaret [il-minaret-31.65388-35.16033] → minaret [il-minaret-31.65388-35.16033] → minaret [il-minaret-31.65388-35.16033] → minaret [il-minaret-31.65388-35.16033] | minaret [il-minaret-31.65388-35.16033] → minaret [il-minaret-31.65388-35.16033] → minaret [il-minaret-31.65388-35.16033] → minaret [il-minaret-31.65388-35.16033] |
| בית זית (il-31.7826-35.1593) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג'ורת א-שמעה (il-31.6514-35.1697) | flat | 0 → 0 → synagogue [il-synagogue-31.66026-35.15226] → 0 | 0 → 0 → synagogue [il-synagogue-31.66026-35.15226] → 0 |
| מוצא עילית (il-31.7935-35.1566) | flat | 0 → synagogue [il-synagogue-31.79065-35.19147] → synagogue [il-synagogue-31.79065-35.19147] → synagogue [il-synagogue-31.79065-35.19147] | 0 → synagogue [il-synagogue-31.79065-35.19147] → synagogue [il-synagogue-31.79065-35.19147] → synagogue [il-synagogue-31.79065-35.19147] |
| מבשרת ציון (il-31.8057-35.1527) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מראח מעלה (il-31.6495-35.1768) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עמינדב (il-31.7511-35.1420) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-נועמן (il-31.7148-35.2495) | flat | minaret [il-minaret-31.71274-35.25027] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71274-35.25027] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71274-35.25027] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71274-35.25027] | minaret [il-minaret-31.71274-35.25027] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71274-35.25027] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71274-35.25027] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71274-35.25027] |
| אל-ח'אס (il-31.7147-35.2547) | flat | minaret [il-minaret-31.71248-35.27266]; minaret [il-minaret-31.71274-35.25027]; minaret [il-minaret-31.71792-35.27436] → minaret [il-minaret-31.71274-35.25027] → minaret [il-minaret-31.71248-35.27266]; minaret [il-minaret-31.71274-35.25027]; minaret [il-minaret-31.71792-35.27436] → minaret [il-minaret-31.71274-35.25027] | minaret [il-minaret-31.71248-35.27266]; minaret [il-minaret-31.71274-35.25027]; minaret [il-minaret-31.71792-35.27436] → minaret [il-minaret-31.71274-35.25027] → minaret [il-minaret-31.71248-35.27266]; minaret [il-minaret-31.71274-35.25027]; minaret [il-minaret-31.71792-35.27436] → minaret [il-minaret-31.71274-35.25027] |
| בית ספר חקלאי עין כרם (il-31.7788-35.1532) | flat | 0 → church [il-church-31.76446-35.15783] → church [il-church-31.76446-35.15783] → 0 | 0 → church [il-church-31.76446-35.15783] → church [il-church-31.76446-35.15783] → church [il-church-31.76446-35.15783] |
| א-שייח' סעד (il-31.7373-35.2568) | flat | minaret [il-minaret-31.73691-35.25707]; minaret [il-minaret-31.76524-35.16126] → minaret [il-minaret-31.71248-35.27266]; minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.73691-35.25707] → minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.73691-35.25707]; minaret [il-minaret-31.74355-35.26756] → minaret [il-minaret-31.71248-35.27266]; minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.73691-35.25707] | minaret [il-minaret-31.73691-35.25707]; minaret [il-minaret-31.76524-35.16126] → minaret [il-minaret-31.71248-35.27266]; minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.73691-35.25707] → minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.73691-35.25707]; minaret [il-minaret-31.74355-35.26756] → minaret [il-minaret-31.71248-35.27266]; minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.73691-35.25707] |
| ענאתא (il-31.8083-35.2573) | flat | church [il-church-31.779-35.22739]; westernWall [jerusalem-wall] → westernWall [jerusalem-wall] → minaret [il-minaret-31.8117-35.26657] → 0 | church [il-church-31.779-35.22739]; westernWall [jerusalem-wall] → westernWall [jerusalem-wall] → minaret [il-minaret-31.8117-35.26657] → 0 |
| אבו דיס (il-31.7642-35.2585) | flat | 0 → 0 → minaret [il-minaret-31.763-35.26575]; minaret [il-minaret-31.77028-35.27256] → 0 | 0 → 0 → minaret [il-minaret-31.763-35.26575]; minaret [il-minaret-31.77028-35.27256] → 0 |
| אל-שוואוורה (il-31.6919-35.2663) | flat | minaret [il-minaret-31.68542-35.26773]; minaret [il-minaret-31.68587-35.21508]; minaret [il-minaret-31.68973-35.25243]; minaret [il-minaret-31.69111-35.26577]; minaret [il-minaret-31.70386-35.2336]; synagogue [il-synagogue-31.71868-35.20201] → minaret [il-minaret-31.68542-35.26773]; minaret [il-minaret-31.68973-35.25243]; minaret [il-minaret-31.69111-35.26577] → minaret [il-minaret-31.68542-35.26773]; minaret [il-minaret-31.68973-35.25243]; minaret [il-minaret-31.69111-35.26577] → minaret [il-minaret-31.68542-35.26773]; minaret [il-minaret-31.68973-35.25243]; minaret [il-minaret-31.69111-35.26577] | minaret [il-minaret-31.68542-35.26773]; minaret [il-minaret-31.68587-35.21508]; minaret [il-minaret-31.68973-35.25243]; minaret [il-minaret-31.69111-35.26577]; minaret [il-minaret-31.70386-35.2336]; synagogue [il-synagogue-31.71868-35.20201] → minaret [il-minaret-31.68542-35.26773]; minaret [il-minaret-31.68973-35.25243]; minaret [il-minaret-31.69111-35.26577] → minaret [il-minaret-31.68542-35.26773]; minaret [il-minaret-31.68973-35.25243]; minaret [il-minaret-31.69111-35.26577] → minaret [il-minaret-31.68542-35.26773]; minaret [il-minaret-31.68973-35.25243]; minaret [il-minaret-31.69111-35.26577] |
| אל-עיזריה (il-31.7732-35.2596) | flat | minaret [il-minaret-31.763-35.26575]; minaret [il-minaret-31.78058-35.24609]; westernWall [jerusalem-wall] → westernWall [jerusalem-wall] → minaret [il-minaret-31.76768-35.28197]; minaret [il-minaret-31.78058-35.24609]; westernWall [jerusalem-wall] → minaret [il-minaret-31.76768-35.28197] | minaret [il-minaret-31.763-35.26575]; minaret [il-minaret-31.78058-35.24609]; westernWall [jerusalem-wall] → minaret [il-minaret-31.76768-35.28197]; westernWall [jerusalem-wall] → minaret [il-minaret-31.76768-35.28197]; minaret [il-minaret-31.78058-35.24609]; westernWall [jerusalem-wall] → minaret [il-minaret-31.76768-35.28197] |
| מעוז ציון (il-31.7938-35.1434) | flat | 0 → 0 → 0 → 0 | 0 → 0 → minaret [il-minaret-31.80747-35.10787] → 0 |
| חיזמא (il-31.8339-35.2636) | flat | minaret [il-minaret-31.83501-35.26015]; minaret [il-minaret-31.83679-35.26796]; synagogue [il-synagogue-31.83825-35.24843] → minaret [il-minaret-31.83501-35.26015]; minaret [il-minaret-31.83679-35.26796]; synagogue [il-synagogue-31.83825-35.24843] → minaret [il-minaret-31.83501-35.26015]; minaret [il-minaret-31.83679-35.26796]; synagogue [il-synagogue-31.83825-35.24843] → minaret [il-minaret-31.83501-35.26015]; minaret [il-minaret-31.83679-35.26796]; synagogue [il-synagogue-31.83825-35.24843] | minaret [il-minaret-31.83501-35.26015]; minaret [il-minaret-31.83679-35.26796]; synagogue [il-synagogue-31.83825-35.24843] → minaret [il-minaret-31.83501-35.26015]; minaret [il-minaret-31.83679-35.26796]; synagogue [il-synagogue-31.83825-35.24843] → minaret [il-minaret-31.83501-35.26015]; minaret [il-minaret-31.83679-35.26796]; synagogue [il-synagogue-31.83825-35.24843] → minaret [il-minaret-31.83501-35.26015]; minaret [il-minaret-31.83679-35.26796]; synagogue [il-synagogue-31.83825-35.24843] |
| דאר סלאח (il-31.7086-35.2648) | flat | minaret [il-minaret-31.70314-35.21931]; minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71248-35.27266]; synagogue [il-synagogue-31.71868-35.20201] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71248-35.27266] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71248-35.27266] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71248-35.27266] | minaret [il-minaret-31.70314-35.21931]; minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71248-35.27266]; synagogue [il-synagogue-31.71868-35.20201] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71248-35.27266] → minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71248-35.27266] → minaret [il-minaret-31.70386-35.2336]; minaret [il-minaret-31.70459-35.25571]; minaret [il-minaret-31.71248-35.27266] |
| א-ראם (il-31.8512-35.2358) | flat | minaret [il-minaret-31.81439-35.22934]; minaret [il-minaret-31.85145-35.23371]; minaret [il-minaret-31.85336-35.23817] → minaret [il-minaret-31.85145-35.23371]; minaret [il-minaret-31.85336-35.23817] → minaret [il-minaret-31.85145-35.23371]; minaret [il-minaret-31.85336-35.23817] → minaret [il-minaret-31.85145-35.23371]; minaret [il-minaret-31.85336-35.23817] | minaret [il-minaret-31.81439-35.22934]; minaret [il-minaret-31.85145-35.23371]; minaret [il-minaret-31.85336-35.23817] → minaret [il-minaret-31.85145-35.23371]; minaret [il-minaret-31.85336-35.23817] → minaret [il-minaret-31.85145-35.23371]; minaret [il-minaret-31.85336-35.23817] → minaret [il-minaret-31.85145-35.23371]; minaret [il-minaret-31.85336-35.23817] |
| אלעזר (il-31.6607-35.1415) | flat | minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.6603-35.14278] → minaret [il-minaret-31.65388-35.16033]; synagogue [il-synagogue-31.65685-35.15055]; synagogue [il-synagogue-31.65729-35.12548]; synagogue [il-synagogue-31.6603-35.14278] → minaret [il-minaret-31.65388-35.16033]; synagogue [il-synagogue-31.65729-35.12548]; synagogue [il-synagogue-31.6603-35.14278]; synagogue [il-synagogue-31.66968-35.16324] → minaret [il-minaret-31.65388-35.16033]; synagogue [il-synagogue-31.65685-35.15055]; synagogue [il-synagogue-31.65729-35.12548]; synagogue [il-synagogue-31.6603-35.14278] | minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.6603-35.14278] → minaret [il-minaret-31.65388-35.16033]; synagogue [il-synagogue-31.65326-35.12674]; synagogue [il-synagogue-31.65729-35.12548]; synagogue [il-synagogue-31.6603-35.14278] → minaret [il-minaret-31.65388-35.16033]; synagogue [il-synagogue-31.65326-35.12674]; synagogue [il-synagogue-31.65729-35.12548]; synagogue [il-synagogue-31.6603-35.14278] → minaret [il-minaret-31.65388-35.16033]; synagogue [il-synagogue-31.65685-35.15055]; synagogue [il-synagogue-31.65729-35.12548]; synagogue [il-synagogue-31.6603-35.14278] |
| א-זעיים (il-31.7873-35.2663) | flat | westernWall [jerusalem-wall] → minaret [il-minaret-31.76768-35.28197]; westernWall [jerusalem-wall] → minaret [il-minaret-31.76768-35.28197] → minaret [il-minaret-31.76768-35.28197] | westernWall [jerusalem-wall] → minaret [il-minaret-31.76768-35.28197]; westernWall [jerusalem-wall] → minaret [il-minaret-31.76768-35.28197] → minaret [il-minaret-31.76768-35.28197] |
| א-סואחרה א-שרקיה (il-31.7433-35.2697) | flat | minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.74355-35.26756]; minaret [il-minaret-31.76524-35.16126] → minaret [il-minaret-31.73627-35.2382]; minaret [il-minaret-31.74355-35.26756] → minaret [il-minaret-31.73627-35.2382]; minaret [il-minaret-31.74355-35.26756] → minaret [il-minaret-31.74355-35.26756] | minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.74355-35.26756]; minaret [il-minaret-31.76524-35.16126] → minaret [il-minaret-31.73627-35.2382]; minaret [il-minaret-31.74355-35.26756] → minaret [il-minaret-31.73627-35.2382]; minaret [il-minaret-31.74355-35.26756] → minaret [il-minaret-31.73627-35.2382]; minaret [il-minaret-31.7419-35.28064]; minaret [il-minaret-31.74355-35.26756] |
| אל-עובידיה (il-31.7186-35.2765) | flat | minaret [il-minaret-31.70454-35.2054]; minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.76524-35.16126] → minaret [il-minaret-31.71792-35.27436] → minaret [il-minaret-31.71792-35.27436] → minaret [il-minaret-31.71792-35.27436] | minaret [il-minaret-31.70454-35.2054]; minaret [il-minaret-31.71792-35.27436]; minaret [il-minaret-31.76524-35.16126] → minaret [il-minaret-31.71792-35.27436] → minaret [il-minaret-31.71792-35.27436] → minaret [il-minaret-31.71792-35.27436] |
| ג'בע (il-31.8573-35.2538) | flat | minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85336-35.23817]; minaret [il-minaret-31.85652-35.22653]; minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.85909-35.25734] → minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.85909-35.25734] → minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.85909-35.25734]; minaret [il-minaret-31.86765-35.22712]; minaret [il-minaret-31.87096-35.2277] → minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.85909-35.25734] | minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85336-35.23817]; minaret [il-minaret-31.85652-35.22653]; minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.85909-35.25734] → minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.85909-35.25734] → minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.85909-35.25734]; minaret [il-minaret-31.86765-35.22712]; minaret [il-minaret-31.87096-35.2277] → minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.85909-35.25734] |
| מ.פ. קלנדיה (il-31.8705-35.2270) | flat | minaret [il-minaret-31.85173-35.23055]; minaret [il-minaret-31.87096-35.2277] → minaret [il-minaret-31.87096-35.2277] → minaret [il-minaret-31.87096-35.2277] → minaret [il-minaret-31.87096-35.2277] | minaret [il-minaret-31.85173-35.23055]; minaret [il-minaret-31.87096-35.2277] → minaret [il-minaret-31.87096-35.2277] → minaret [il-minaret-31.87096-35.2277] → minaret [il-minaret-31.87096-35.2277] |
| ام عسلة (il-31.6977-35.2820) | flat | minaret [il-minaret-31.69807-35.28137]; minaret [il-minaret-31.70454-35.2054] → minaret [il-minaret-31.69807-35.28137] → minaret [il-minaret-31.69807-35.28137] → minaret [il-minaret-31.69807-35.28137] | minaret [il-minaret-31.69807-35.28137]; minaret [il-minaret-31.70454-35.2054] → minaret [il-minaret-31.69807-35.28137] → minaret [il-minaret-31.69807-35.28137] → minaret [il-minaret-31.69807-35.28137] |
| ביר נבאלא (il-31.8510-35.1988) | flat | minaret [il-minaret-31.84731-35.19674]; westernWall [jerusalem-wall] → minaret [il-minaret-31.84731-35.19674] → minaret [il-minaret-31.84731-35.19674] → minaret [il-minaret-31.84731-35.19674] | minaret [il-minaret-31.84731-35.19674]; westernWall [jerusalem-wall] → minaret [il-minaret-31.84731-35.19674] → minaret [il-minaret-31.84731-35.19674] → minaret [il-minaret-31.84731-35.19674] |
| קלנדיה (il-31.8634-35.2071) | flat | minaret [il-minaret-31.86299-35.20799] → minaret [il-minaret-31.86299-35.20799] → minaret [il-minaret-31.86299-35.20799] → minaret [il-minaret-31.86299-35.20799] | minaret [il-minaret-31.86299-35.20799] → minaret [il-minaret-31.86299-35.20799] → minaret [il-minaret-31.86299-35.20799] → minaret [il-minaret-31.86299-35.20799] |
| ערב אל ג'האלין (il-31.7658-35.2833) | flat | westernWall [jerusalem-wall] → westernWall [jerusalem-wall] → 0 → 0 | westernWall [jerusalem-wall] → westernWall [jerusalem-wall] → minaret [il-minaret-31.76473-35.27793] → 0 |
| בית חנינא אל-בלד (il-31.8310-35.2057) | flat | minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.82927-35.20786] → minaret [il-minaret-31.82927-35.20786]; synagogue [il-synagogue-31.81904-35.18761]; synagogue [il-synagogue-31.82196-35.19443] → minaret [il-minaret-31.82927-35.20786]; synagogue [il-synagogue-31.81904-35.18761]; synagogue [il-synagogue-31.82196-35.19443] → minaret [il-minaret-31.82927-35.20786]; synagogue [il-synagogue-31.81904-35.18761]; synagogue [il-synagogue-31.82196-35.19443] | minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.82927-35.20786] → minaret [il-minaret-31.82927-35.20786]; synagogue [il-synagogue-31.81904-35.18761]; synagogue [il-synagogue-31.82196-35.19443] → minaret [il-minaret-31.82927-35.20786]; synagogue [il-synagogue-31.81904-35.18761]; synagogue [il-synagogue-31.82196-35.19443] → minaret [il-minaret-31.82927-35.20786]; synagogue [il-synagogue-31.81904-35.18761]; synagogue [il-synagogue-31.82196-35.19443] |
| אל בירה (il-31.9007-35.2118) | flat | minaret [il-minaret-31.88818-35.16797]; minaret [il-minaret-31.89643-35.18295]; minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.90408-35.20741] | minaret [il-minaret-31.88818-35.16797]; minaret [il-minaret-31.89643-35.18295]; minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.90408-35.20741] |
| אל-ג'דירה (il-31.8579-35.1968) | flat | minaret [il-minaret-31.85931-35.19784] → minaret [il-minaret-31.85931-35.19784] → minaret [il-minaret-31.85931-35.19784] → minaret [il-minaret-31.85931-35.19784] | minaret [il-minaret-31.85931-35.19784] → minaret [il-minaret-31.85931-35.19784] → minaret [il-minaret-31.85931-35.19784] → minaret [il-minaret-31.85931-35.19784] |
| תל ציון (il-31.8796-35.2382) | flat | minaret [il-minaret-31.89272-35.20815]; synagogue [il-synagogue-31.87657-35.24031] → synagogue [il-synagogue-31.87657-35.24031] → synagogue [il-synagogue-31.87657-35.24031] → synagogue [il-synagogue-31.87657-35.24031] | minaret [il-minaret-31.89272-35.20815]; synagogue [il-synagogue-31.87657-35.24031] → synagogue [il-synagogue-31.87657-35.24031] → synagogue [il-synagogue-31.87657-35.24031] → minaret [il-minaret-31.88379-35.20008]; synagogue [il-synagogue-31.87657-35.24031] |
| מעלה אדומים (il-31.7706-35.2985) | flat | church [il-church-31.7788-35.24738]; minaret [il-minaret-31.76473-35.27793]; minaret [il-minaret-31.76689-35.25256] → 0 → 0 → 0 | church [il-church-31.7788-35.24738]; minaret [il-minaret-31.76473-35.27793]; minaret [il-minaret-31.76689-35.25256] → 0 → 0 → 0 |
| פסגות (il-31.8986-35.2241) | flat | church [il-church-31.90157-35.20364]; minaret [il-minaret-31.89456-35.21085]; minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.87905-35.23784]; synagogue [il-synagogue-31.89548-35.22981] → synagogue [il-synagogue-31.89548-35.22981] → minaret [il-minaret-31.9089-35.20165]; synagogue [il-synagogue-31.89548-35.22981] → synagogue [il-synagogue-31.89548-35.22981] | church [il-church-31.90157-35.20364]; minaret [il-minaret-31.89456-35.21085]; minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.87905-35.23784]; synagogue [il-synagogue-31.89548-35.22981] → synagogue [il-synagogue-31.89548-35.22981] → minaret [il-minaret-31.90408-35.20741]; minaret [il-minaret-31.9089-35.20165]; synagogue [il-synagogue-31.89548-35.22981] → synagogue [il-synagogue-31.89548-35.22981] |
| גבע בנימין (אדם) (il-31.8503-35.2740) | flat | minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85678-35.2631]; westernWall [jerusalem-wall] → minaret [il-minaret-31.85678-35.2631] → minaret [il-minaret-31.85678-35.2631] → minaret [il-minaret-31.85678-35.2631] | minaret [il-minaret-31.85262-35.24645]; minaret [il-minaret-31.85678-35.2631]; westernWall [jerusalem-wall] → minaret [il-minaret-31.85678-35.2631] → minaret [il-minaret-31.85678-35.2631] → minaret [il-minaret-31.85678-35.2631] |
| רמאללה (il-31.9031-35.1952) | flat | minaret [il-minaret-31.88818-35.16797]; minaret [il-minaret-31.89272-35.20815]; minaret [il-minaret-31.90415-35.19605] → minaret [il-minaret-31.90415-35.19605] → minaret [il-minaret-31.90415-35.19605] → minaret [il-minaret-31.90415-35.19605] | minaret [il-minaret-31.88818-35.16797]; minaret [il-minaret-31.89272-35.20815]; minaret [il-minaret-31.90415-35.19605] → minaret [il-minaret-31.90415-35.19605] → minaret [il-minaret-31.90415-35.19605] → minaret [il-minaret-31.90415-35.19605] |
| ראפאת (il-31.8718-35.1928) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-ג'יב (il-31.8510-35.1823) | flat | minaret [il-minaret-31.85137-35.18419] → minaret [il-minaret-31.85137-35.18419] → minaret [il-minaret-31.85137-35.18419] → minaret [il-minaret-31.85137-35.18419] | minaret [il-minaret-31.85137-35.18419] → minaret [il-minaret-31.85137-35.18419] → minaret [il-minaret-31.85137-35.18419] → minaret [il-minaret-31.85137-35.18419] |
| כוכב יעקב (il-31.8814-35.2453) | flat | minaret [il-minaret-31.85336-35.23817]; minaret [il-minaret-31.85652-35.22653]; synagogue [il-synagogue-31.88018-35.2426] → minaret [il-minaret-31.86765-35.22712]; minaret [il-minaret-31.87096-35.2277]; synagogue [il-synagogue-31.88018-35.2426] → minaret [il-minaret-31.86765-35.22712]; minaret [il-minaret-31.87096-35.2277]; synagogue [il-synagogue-31.88018-35.2426] → minaret [il-minaret-31.86765-35.22712]; minaret [il-minaret-31.87096-35.2277]; synagogue [il-synagogue-31.88018-35.2426] | minaret [il-minaret-31.85336-35.23817]; minaret [il-minaret-31.85652-35.22653]; synagogue [il-synagogue-31.88018-35.2426] → minaret [il-minaret-31.86765-35.22712]; minaret [il-minaret-31.87096-35.2277]; synagogue [il-synagogue-31.88018-35.2426] → minaret [il-minaret-31.86765-35.22712]; minaret [il-minaret-31.87096-35.2277]; synagogue [il-synagogue-31.88018-35.2426] → minaret [il-minaret-31.86765-35.22712]; minaret [il-minaret-31.87096-35.2277]; synagogue [il-synagogue-31.88018-35.2426] |
| ביתוניא (il-31.8860-35.1704) | flat | minaret [il-minaret-31.88818-35.16797]; minaret [il-minaret-31.89272-35.20815] → minaret [il-minaret-31.88818-35.16797] → minaret [il-minaret-31.88818-35.16797] → minaret [il-minaret-31.88818-35.16797] | minaret [il-minaret-31.88818-35.16797]; minaret [il-minaret-31.89272-35.20815] → minaret [il-minaret-31.88818-35.16797] → minaret [il-minaret-31.88818-35.16797] → minaret [il-minaret-31.88818-35.16797] |
| الطيرة (il-31.9200-35.1786) | flat | minaret [il-minaret-31.89272-35.20815]; minaret [il-minaret-31.91525-35.18128] → minaret [il-minaret-31.91525-35.18128] → minaret [il-minaret-31.91525-35.18128] → minaret [il-minaret-31.91525-35.18128] | minaret [il-minaret-31.89272-35.20815]; minaret [il-minaret-31.91525-35.18128] → minaret [il-minaret-31.91525-35.18128] → minaret [il-minaret-31.91525-35.18128] → minaret [il-minaret-31.91525-35.18128] |
| בית אל (il-31.9421-35.2224) | flat | synagogue [il-synagogue-31.94255-35.22212] → synagogue [il-synagogue-31.94255-35.22212] → synagogue [il-synagogue-31.94255-35.22212] → synagogue [il-synagogue-31.94255-35.22212] | minaret [il-minaret-31.90415-35.19605]; minaret [il-minaret-31.9183-35.21075]; synagogue [il-synagogue-31.94255-35.22212] → synagogue [il-synagogue-31.94255-35.22212] → synagogue [il-synagogue-31.94255-35.22212] → synagogue [il-synagogue-31.94255-35.22212] |
| סורדא (il-31.9374-35.2007) | flat | minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.91261-35.2183]; minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.93614-35.20634] → minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.93614-35.20634] → minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.93614-35.20634]; synagogue [il-synagogue-31.94728-35.22321] → minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.93614-35.20634] | minaret [il-minaret-31.90401-35.21183]; minaret [il-minaret-31.91261-35.2183]; minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.93614-35.20634] → minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.93614-35.20634] → minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.93614-35.20634]; synagogue [il-synagogue-31.94728-35.22321] → minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.93614-35.20634] |
| שכונת אל-ח'לאיילה (il-31.8498-35.1652) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ראשית (il-31.9364-35.2223) | flat | minaret [il-minaret-31.9183-35.21075]; minaret [il-minaret-31.92053-35.20462]; synagogue [il-synagogue-31.93544-35.22524] → synagogue [il-synagogue-31.93544-35.22524] → synagogue [il-synagogue-31.93544-35.22524] → synagogue [il-synagogue-31.93544-35.22524] | minaret [il-minaret-31.9183-35.21075]; minaret [il-minaret-31.92053-35.20462]; synagogue [il-synagogue-31.93544-35.22524] → synagogue [il-synagogue-31.93544-35.22524] → synagogue [il-synagogue-31.93544-35.22524] → synagogue [il-synagogue-31.93544-35.22524] |
| גבעת זאב (il-31.8623-35.1688) | flat | synagogue [il-synagogue-31.8588-35.168] → synagogue [il-synagogue-31.8588-35.168] → synagogue [il-synagogue-31.8588-35.168] → synagogue [il-synagogue-31.8588-35.168] | synagogue [il-synagogue-31.8588-35.168] → synagogue [il-synagogue-31.8588-35.168] → synagogue [il-synagogue-31.8588-35.168] → synagogue [il-synagogue-31.8588-35.168] |
| מ.פ. ג'לזון (il-31.9515-35.2116) | flat | minaret [il-minaret-31.95138-35.2123]; minaret [il-minaret-31.95314-35.25185] → minaret [il-minaret-31.95138-35.2123] → minaret [il-minaret-31.95138-35.2123]; minaret [il-minaret-31.95541-35.24435]; synagogue [il-synagogue-31.94728-35.22321] → minaret [il-minaret-31.95138-35.2123]; minaret [il-minaret-31.95541-35.24435] | minaret [il-minaret-31.95138-35.2123]; minaret [il-minaret-31.95314-35.25185] → minaret [il-minaret-31.95138-35.2123] → minaret [il-minaret-31.95138-35.2123]; minaret [il-minaret-31.95541-35.24435]; synagogue [il-synagogue-31.94728-35.22321] → minaret [il-minaret-31.95138-35.2123]; minaret [il-minaret-31.95541-35.24435]; synagogue [il-synagogue-31.94728-35.22321] |
| גבעון החדשה (il-31.8482-35.1576) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית אג'זא (il-31.8480-35.1516) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בידו (il-31.8350-35.1469) | flat | minaret [il-minaret-31.83391-35.14665]; minaret [il-minaret-31.83847-35.15421] → minaret [il-minaret-31.83391-35.14665]; minaret [il-minaret-31.83847-35.15421] → minaret [il-minaret-31.83391-35.14665]; minaret [il-minaret-31.83847-35.15421] → minaret [il-minaret-31.83391-35.14665]; minaret [il-minaret-31.83847-35.15421] | minaret [il-minaret-31.83391-35.14665]; minaret [il-minaret-31.83847-35.15421] → minaret [il-minaret-31.83391-35.14665]; minaret [il-minaret-31.83847-35.15421] → minaret [il-minaret-31.83391-35.14665]; minaret [il-minaret-31.83847-35.15421] → minaret [il-minaret-31.83391-35.14665]; minaret [il-minaret-31.83847-35.15421] |
| בית סוריכ (il-31.8230-35.1496) | flat | minaret [il-minaret-31.82365-35.1497] → minaret [il-minaret-31.82365-35.1497]; synagogue [il-synagogue-31.80823-35.16537] → minaret [il-minaret-31.82365-35.1497]; synagogue [il-synagogue-31.80823-35.16537] → minaret [il-minaret-31.82365-35.1497] | minaret [il-minaret-31.82365-35.1497] → minaret [il-minaret-31.82365-35.1497]; synagogue [il-synagogue-31.80823-35.16537] → minaret [il-minaret-31.82365-35.1497]; synagogue [il-synagogue-31.80823-35.16537] → minaret [il-minaret-31.82365-35.1497]; synagogue [il-synagogue-31.80823-35.16537] |
| אל-קובייבה (il-31.8403-35.1371) | flat | minaret [il-minaret-31.84023-35.13634] → minaret [il-minaret-31.84023-35.13634] → minaret [il-minaret-31.84023-35.13634] → minaret [il-minaret-31.84023-35.13634] | minaret [il-minaret-31.84023-35.13634] → minaret [il-minaret-31.84023-35.13634] → minaret [il-minaret-31.84023-35.13634] → minaret [il-minaret-31.84023-35.13634] |
| קטנה (il-31.8370-35.1252) | flat | minaret [il-minaret-31.8313-35.10877]; minaret [il-minaret-31.8344-35.12245] → minaret [il-minaret-31.8313-35.10877]; minaret [il-minaret-31.8344-35.12245] → minaret [il-minaret-31.8313-35.10877]; minaret [il-minaret-31.8344-35.12245] → minaret [il-minaret-31.8313-35.10877]; minaret [il-minaret-31.8344-35.12245] | minaret [il-minaret-31.8313-35.10877]; minaret [il-minaret-31.8344-35.12245] → minaret [il-minaret-31.8313-35.10877]; minaret [il-minaret-31.8344-35.12245] → minaret [il-minaret-31.8313-35.10877]; minaret [il-minaret-31.8344-35.12245] → minaret [il-minaret-31.8313-35.10877]; minaret [il-minaret-31.8344-35.12245] |
| הר אדר (il-31.8269-35.1296) | flat | synagogue [il-synagogue-31.82483-35.13117] → synagogue [il-synagogue-31.80599-35.14932]; synagogue [il-synagogue-31.82483-35.13117] → synagogue [il-synagogue-31.80599-35.14932]; synagogue [il-synagogue-31.82483-35.13117] → synagogue [il-synagogue-31.82483-35.13117] | synagogue [il-synagogue-31.82483-35.13117] → synagogue [il-synagogue-31.80599-35.14932]; synagogue [il-synagogue-31.82483-35.13117] → synagogue [il-synagogue-31.80599-35.14932]; synagogue [il-synagogue-31.82483-35.13117] → synagogue [il-synagogue-31.82483-35.13117] |
| אל ערוב (il-31.6232-35.1369) | flat | minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62285-35.14074]; minaret [il-minaret-31.62633-35.148]; minaret [il-minaret-31.62754-35.14249] → minaret [il-minaret-31.62285-35.14074]; minaret [il-minaret-31.62754-35.14249] → minaret [il-minaret-31.62285-35.14074]; minaret [il-minaret-31.62754-35.14249]; minaret [il-minaret-31.62762-35.15748] → minaret [il-minaret-31.62285-35.14074]; minaret [il-minaret-31.62754-35.14249] | minaret [il-minaret-31.6189-35.11126]; minaret [il-minaret-31.62285-35.14074]; minaret [il-minaret-31.62633-35.148]; minaret [il-minaret-31.62754-35.14249] → minaret [il-minaret-31.62285-35.14074]; minaret [il-minaret-31.62754-35.14249] → minaret [il-minaret-31.62285-35.14074]; minaret [il-minaret-31.62754-35.14249]; minaret [il-minaret-31.62762-35.15748] → minaret [il-minaret-31.62285-35.14074]; minaret [il-minaret-31.62754-35.14249] |
| בית פג'אר (il-31.6232-35.1539) | flat | minaret [il-minaret-31.62389-35.15398]; minaret [il-minaret-31.62633-35.148] → minaret [il-minaret-31.62389-35.15398]; minaret [il-minaret-31.62633-35.148] → minaret [il-minaret-31.62389-35.15398]; minaret [il-minaret-31.62633-35.148] → minaret [il-minaret-31.62389-35.15398]; minaret [il-minaret-31.62633-35.148] | minaret [il-minaret-31.62389-35.15398]; minaret [il-minaret-31.62633-35.148] → minaret [il-minaret-31.62389-35.15398]; minaret [il-minaret-31.62633-35.148] → minaret [il-minaret-31.62389-35.15398]; minaret [il-minaret-31.62633-35.148] → minaret [il-minaret-31.62389-35.15398]; minaret [il-minaret-31.62633-35.148] |
| בית הברכה (il-31.6319-35.1316) | flat | minaret [il-minaret-31.62053-35.10243]; minaret [il-minaret-31.62633-35.148] → minaret [il-minaret-31.62762-35.15748] → minaret [il-minaret-31.62762-35.15748] → minaret [il-minaret-31.62762-35.15748] | minaret [il-minaret-31.62053-35.10243]; minaret [il-minaret-31.62633-35.148] → minaret [il-minaret-31.62762-35.15748] → minaret [il-minaret-31.62762-35.15748] → minaret [il-minaret-31.62762-35.15748] |
| מראח רבאח (il-31.6353-35.1859) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מגדל עוז (il-31.6397-35.1425) | flat | minaret [il-minaret-31.6189-35.11126]; synagogue [il-synagogue-31.64119-35.14251] → minaret [il-minaret-31.62762-35.15748]; synagogue [il-synagogue-31.64119-35.14251] → minaret [il-minaret-31.62762-35.15748]; synagogue [il-synagogue-31.64119-35.14251] → synagogue [il-synagogue-31.64119-35.14251] | minaret [il-minaret-31.6189-35.11126]; synagogue [il-synagogue-31.64119-35.14251] → minaret [il-minaret-31.62762-35.15748]; synagogue [il-synagogue-31.64119-35.14251] → minaret [il-minaret-31.62762-35.15748]; synagogue [il-synagogue-31.64119-35.14251] → minaret [il-minaret-31.62762-35.15748]; synagogue [il-synagogue-31.64119-35.14251] |
| ראש צורים (il-31.6676-35.1253) | flat | minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.6678-35.12633] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6678-35.12633] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6678-35.12633]; synagogue [il-synagogue-31.66968-35.16324] → synagogue [il-synagogue-31.6678-35.12633]; synagogue [il-synagogue-31.66968-35.16324] | minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.6678-35.12633] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6678-35.12633] → minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6678-35.12633]; synagogue [il-synagogue-31.66968-35.16324] → synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.6678-35.12633]; synagogue [il-synagogue-31.66968-35.16324] |
| נווה דניאל (il-31.6762-35.1428) | flat | minaret [il-minaret-31.65388-35.16033]; minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.67668-35.14304] → synagogue [il-synagogue-31.67668-35.14304] → synagogue [il-synagogue-31.66968-35.16324]; synagogue [il-synagogue-31.67668-35.14304] → synagogue [il-synagogue-31.66968-35.16324]; synagogue [il-synagogue-31.67668-35.14304] | minaret [il-minaret-31.65388-35.16033]; minaret [il-minaret-31.66558-35.16824]; synagogue [il-synagogue-31.67668-35.14304] → synagogue [il-synagogue-31.67668-35.14304] → synagogue [il-synagogue-31.66968-35.16324]; synagogue [il-synagogue-31.67668-35.14304] → synagogue [il-synagogue-31.66968-35.16324]; synagogue [il-synagogue-31.67668-35.14304] |
| שדה בועז (il-31.6937-35.1479) | flat | 0 → synagogue [il-synagogue-31.66968-35.16324] → synagogue [il-synagogue-31.66968-35.16324] → 0 | 0 → synagogue [il-synagogue-31.66968-35.16324] → synagogue [il-synagogue-31.66968-35.16324] → synagogue [il-synagogue-31.66968-35.16324] |
| איבי הנחל (il-31.6056-35.2191) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נוקדים (il-31.6450-35.2441) | flat | minaret [il-minaret-31.63482-35.2209] → 0 → minaret [il-minaret-31.64057-35.22646] → 0 | minaret [il-minaret-31.63482-35.2209] → 0 → minaret [il-minaret-31.64057-35.22646] → 0 |
| כפר אלדד (il-31.6541-35.2509) | flat | minaret [il-minaret-31.63482-35.2209] → 0 → 0 → 0 | minaret [il-minaret-31.63482-35.2209] → 0 → 0 → 0 |
| מעלה רחבעם (il-31.6478-35.2585) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תקוע (il-31.6533-35.2293) | flat | synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.65387-35.23004] → synagogue [il-synagogue-31.65387-35.23004] → synagogue [il-synagogue-31.65387-35.23004] → synagogue [il-synagogue-31.65387-35.23004] | synagogue [il-synagogue-31.64659-35.14331]; synagogue [il-synagogue-31.65387-35.23004] → synagogue [il-synagogue-31.65387-35.23004] → synagogue [il-synagogue-31.65387-35.23004] → synagogue [il-synagogue-31.65387-35.23004] |
| חוות שדה בר (il-31.6597-35.2440) | flat | minaret [il-minaret-31.63482-35.2209] → 0 → 0 → 0 | minaret [il-minaret-31.63482-35.2209] → 0 → 0 → 0 |
| ג'ובת א-דיב (il-31.6634-35.2480) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבנת (il-31.6793-35.4365) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניצנים (il-31.7168-34.6342) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעתי (il-31.7340-34.6793) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עזר (il-31.7365-34.6715) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אמונים (il-31.7453-34.6770) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה עוזיהו (il-31.7576-34.6785) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית עזרא (il-31.7366-34.6564) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניצן ב׳ (il-31.7361-34.6360) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניצן (il-31.7399-34.6318) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עזריקם (il-31.7538-34.6949) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אשדוד (il-31.7977-34.6530) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניר גלים (il-31.8245-34.6820) | flat | synagogue [il-synagogue-31.82546-34.68248] → synagogue [il-synagogue-31.82546-34.68248] → synagogue [il-synagogue-31.82546-34.68248] → synagogue [il-synagogue-31.82546-34.68248] | synagogue [il-synagogue-31.82546-34.68248] → synagogue [il-synagogue-31.82546-34.68248] → synagogue [il-synagogue-31.82546-34.68248] → synagogue [il-synagogue-31.82546-34.68248] |
| בני דרום (il-31.8207-34.6916) | flat | synagogue [il-synagogue-31.82113-34.6923] → synagogue [il-synagogue-31.82113-34.6923] → synagogue [il-synagogue-31.82113-34.6923] → synagogue [il-synagogue-31.82113-34.6923] | synagogue [il-synagogue-31.82113-34.6923] → synagogue [il-synagogue-31.82113-34.6923] → synagogue [il-synagogue-31.82113-34.6923] → synagogue [il-synagogue-31.82113-34.6923] |
| שתולים (il-31.7720-34.6836) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גן יבנה (il-31.7871-34.7097) | flat | synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] | synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] |
| גן הדרום (il-31.8036-34.6998) | flat | synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] | synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] → synagogue [il-synagogue-31.79418-34.70273] |
| אביגדור (il-31.7110-34.7436) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קרית מלאכי (il-31.7316-34.7446) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תימורים (il-31.7161-34.7613) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אורות (il-31.7407-34.7349) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר ורבורג (il-31.7200-34.7242) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר אחים (il-31.7448-34.7564) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| באר טוביה (il-31.7339-34.7263) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ינון (il-31.7429-34.7795) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר הרי״ף (il-31.7463-34.7925) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תלמי יחיאל (il-31.7537-34.7640) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בני ראם (il-31.7698-34.7906) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חצור אשדוד (il-31.7731-34.7210) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חצב (il-31.7793-34.7694) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בני עי"ש (il-31.7892-34.7606) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כנות (il-31.8026-34.7524) | flat | synagogue [il-synagogue-31.80088-34.76091] → synagogue [il-synagogue-31.80088-34.76091] → synagogue [il-synagogue-31.80088-34.76091] → synagogue [il-synagogue-31.80088-34.76091] | synagogue [il-synagogue-31.80088-34.76091] → synagogue [il-synagogue-31.80088-34.76091] → synagogue [il-synagogue-31.80088-34.76091] → synagogue [il-synagogue-31.80088-34.76091] |
| גני טל (il-31.7887-34.7912) | flat | synagogue [il-synagogue-31.78842-34.79461] → synagogue [il-synagogue-31.78842-34.79461] → synagogue [il-synagogue-31.78842-34.79461]; synagogue [il-synagogue-31.8013-34.82265] → synagogue [il-synagogue-31.78842-34.79461] | synagogue [il-synagogue-31.78842-34.79461] → synagogue [il-synagogue-31.78842-34.79461] → synagogue [il-synagogue-31.78842-34.79461]; synagogue [il-synagogue-31.8013-34.82265] → synagogue [il-synagogue-31.78842-34.79461] |
| חפץ חיים (il-31.7888-34.8000) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית חלקיה (il-31.7927-34.8108) | flat | synagogue [il-synagogue-31.78889-34.80613] → synagogue [il-synagogue-31.78889-34.80613] → synagogue [il-synagogue-31.78889-34.80613] → synagogue [il-synagogue-31.78889-34.80613] | synagogue [il-synagogue-31.78889-34.80613] → synagogue [il-synagogue-31.78889-34.80613] → synagogue [il-synagogue-31.78889-34.80613] → synagogue [il-synagogue-31.78889-34.80613] |
| ביצרון (il-31.7950-34.7393) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גדרה (il-31.8118-34.7804) | flat | synagogue [il-synagogue-31.81544-34.77392] → synagogue [il-synagogue-31.81544-34.77392] → synagogue [il-synagogue-31.81544-34.77392] → synagogue [il-synagogue-31.81544-34.77392] | synagogue [il-synagogue-31.81544-34.77392] → synagogue [il-synagogue-31.81544-34.77392] → synagogue [il-synagogue-31.81544-34.77392] → synagogue [il-synagogue-31.81544-34.77392] |
| קדרון (il-31.8151-34.7977) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל עזי (il-31.7189-34.8143) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר מנחם (il-31.7310-34.8352) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גפן (il-31.7405-34.8792) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תירוש (il-31.7508-34.8861) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רבדים (il-31.7731-34.8153) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יד בנימין (il-31.7978-34.8216) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זכריה (il-31.7098-34.9441) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדות מיכה (il-31.7215-34.9206) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית ג'מל (il-31.7248-34.9761) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ישעי (il-31.7516-34.9654) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תרום (il-31.7826-34.9815) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר אוריה (il-31.7920-34.9466) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תעוז (il-31.8020-34.9745) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טל שחר (il-31.8051-34.9022) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מטע (il-31.7169-35.0616) | flat | synagogue [il-synagogue-31.71423-35.061] → synagogue [il-synagogue-31.71423-35.061] → synagogue [il-synagogue-31.71423-35.061] → synagogue [il-synagogue-31.71423-35.061] | synagogue [il-synagogue-31.71423-35.061] → synagogue [il-synagogue-31.71423-35.061] → synagogue [il-synagogue-31.71423-35.061] → synagogue [il-synagogue-31.71423-35.061] |
| בר גיורא (il-31.7298-35.0727) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נס הרים (il-31.7445-35.0580) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כסלון (il-31.7741-35.0492) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמת רזיאל (il-31.7737-35.0738) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אשתאול (il-31.7802-35.0098) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| איתנים (il-31.7790-35.0950) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת יערים (il-31.7860-35.0926) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית מאיר (il-31.7939-35.0361) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שורש (il-31.7975-35.0651) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שואבה (il-31.7992-35.0791) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מסילת ציון (il-31.8018-35.0115) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חוות נווה אורי הישנה (il-31.7120-35.1647) | flat | synagogue [il-synagogue-31.64659-35.14331] → 0 → 0 → minaret [il-minaret-31.70696-35.19586] | synagogue [il-synagogue-31.64659-35.14331] → minaret [il-minaret-31.70696-35.19586] → minaret [il-minaret-31.70696-35.19586] → minaret [il-minaret-31.70696-35.19586] |
| אבן ספיר (il-31.7630-35.1351) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צובה (il-31.7827-35.1207) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין ראפה (il-31.7902-35.1163) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין נקובא (il-31.7936-35.1191) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבו גוש (il-31.8063-35.1089) | flat | minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.80747-35.10787] → minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.80747-35.10787] → minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.80747-35.10787] → minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.80747-35.10787] | minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.80747-35.10787] → minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.80747-35.10787] → minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.80747-35.10787] → minaret [il-minaret-31.80386-35.11386]; minaret [il-minaret-31.80747-35.10787] |
| בית נקופה (il-31.8029-35.1253) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קריית ענבים (il-31.8100-35.1203) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעלה החמישה (il-31.8175-35.1116) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קרית יערים (il-31.8035-35.1013) | flat | synagogue [il-synagogue-31.8047-35.1043] → synagogue [il-synagogue-31.8047-35.1043] → minaret [il-minaret-31.80386-35.11386]; synagogue [il-synagogue-31.8047-35.1043] → minaret [il-minaret-31.80386-35.11386]; synagogue [il-synagogue-31.8047-35.1043] | synagogue [il-synagogue-31.8047-35.1043] → synagogue [il-synagogue-31.8047-35.1043] → minaret [il-minaret-31.80386-35.11386]; synagogue [il-synagogue-31.8047-35.1043] → minaret [il-minaret-31.80386-35.11386]; synagogue [il-synagogue-31.8047-35.1043] |
| יד השמונה (il-31.8095-35.0902) | flat | 0 → 0 → synagogue [il-synagogue-31.8047-35.1043] → synagogue [il-synagogue-31.8047-35.1043] | 0 → 0 → synagogue [il-synagogue-31.8047-35.1043] → synagogue [il-synagogue-31.8047-35.1043] |
| נוה אילן (il-31.8092-35.0789) | flat | minaret [il-minaret-31.80747-35.10787] → 0 → 0 → 0 | minaret [il-minaret-31.80747-35.10787] → 0 → 0 → 0 |
| חוות צאן קידר (il-31.7366-35.3195) | flat | minaret [il-minaret-31.70454-35.2054] → minaret [il-minaret-31.72468-35.28968] → minaret [il-minaret-31.72468-35.28968] → minaret [il-minaret-31.72468-35.28968] | minaret [il-minaret-31.70454-35.2054] → minaret [il-minaret-31.72468-35.28968] → minaret [il-minaret-31.72468-35.28968] → minaret [il-minaret-31.72468-35.28968] |
| קידר (il-31.7546-35.3105) | flat | minaret [il-minaret-31.72468-35.28968] → 0 → 0 → 0 | minaret [il-minaret-31.72468-35.28968] → 0 → 0 → 0 |
| מישור אדומים (il-31.8038-35.3293) | flat | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 |
| ח'אן אל-אחמר (il-31.8109-35.3344) | flat | minaret [il-minaret-31.77787-35.22965] → 0 → 0 → 0 | minaret [il-minaret-31.77787-35.22965] → 0 → 0 → 0 |
| ביר אל-מקסוב (il-31.8025-35.3113) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ואדי סניסל (il-31.8019-35.3060) | flat | minaret [il-minaret-31.76768-35.28197] → 0 → 0 → 0 | minaret [il-minaret-31.76768-35.28197] → 0 → 0 → 0 |
| כסאראת (il-31.8056-35.3102) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-ר'ואליה (il-31.8133-35.3046) | flat | minaret [il-minaret-31.77787-35.22965] → 0 → 0 → 0 | minaret [il-minaret-31.77787-35.22965] → 0 → 0 → 0 |
| אלמוג (il-31.7900-35.4616) | flat | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 |
| נווה מבטח (il-31.8059-34.7410) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משגב דב (il-31.8199-34.7386) | flat | synagogue [il-synagogue-31.8207-34.73532] → synagogue [il-synagogue-31.8207-34.73532] → synagogue [il-synagogue-31.8207-34.73532] → synagogue [il-synagogue-31.8207-34.73532] | synagogue [il-synagogue-31.8207-34.73532] → synagogue [il-synagogue-31.8207-34.73532] → synagogue [il-synagogue-31.8207-34.73532] → synagogue [il-synagogue-31.8207-34.73532] |
| מישר (il-31.8175-34.7531) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עשרת (il-31.8248-34.7456) | flat | synagogue [il-synagogue-31.82573-34.74744] → synagogue [il-synagogue-31.82573-34.74744] → synagogue [il-synagogue-31.82573-34.74744] → synagogue [il-synagogue-31.82573-34.74744] | synagogue [il-synagogue-31.82573-34.74744] → synagogue [il-synagogue-31.82573-34.74744] → synagogue [il-synagogue-31.82573-34.74744] → synagogue [il-synagogue-31.82573-34.74744] |
| בית רבן - גבעת וושינגטון (il-31.8168-34.7281) | flat | synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] | synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] |
| שדמה (il-31.8331-34.7404) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר מרדכי (il-31.8311-34.7562) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר אביב (il-31.8318-34.7213) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קבוצת יבנה (il-31.8138-34.7191) | flat | synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] | synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] → synagogue [il-synagogue-31.81873-34.72205] |
| בית אלעזרי (il-31.8461-34.8030) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רחובות (il-31.8953-34.8106) | flat | synagogue [il-synagogue-31.89576-34.8168] → synagogue [il-synagogue-31.89576-34.8168] → synagogue [il-synagogue-31.89576-34.8168] → synagogue [il-synagogue-31.89576-34.8168] | synagogue [il-synagogue-31.89576-34.8168] → synagogue [il-synagogue-31.89576-34.8168] → synagogue [il-synagogue-31.89576-34.8168] → synagogue [il-synagogue-31.89576-34.8168] |
| גבעת ברנר (il-31.8675-34.8005) | flat | 0 → synagogue [il-synagogue-31.85692-34.82309] → synagogue [il-synagogue-31.85692-34.82309]; synagogue [il-synagogue-31.8599-34.82318] → 0 | 0 → synagogue [il-synagogue-31.85692-34.82309] → synagogue [il-synagogue-31.85692-34.82309]; synagogue [il-synagogue-31.8599-34.82318] → 0 |
| קרית עקרון (il-31.8608-34.8233) | flat | synagogue [il-synagogue-31.8599-34.82318] → synagogue [il-synagogue-31.85517-34.84083]; synagogue [il-synagogue-31.8599-34.82318] → synagogue [il-synagogue-31.85517-34.84083]; synagogue [il-synagogue-31.8599-34.82318] → synagogue [il-synagogue-31.8599-34.82318] | synagogue [il-synagogue-31.8599-34.82318] → synagogue [il-synagogue-31.85517-34.84083]; synagogue [il-synagogue-31.8599-34.82318] → synagogue [il-synagogue-31.85517-34.84083]; synagogue [il-synagogue-31.8599-34.82318] → synagogue [il-synagogue-31.85517-34.84083]; synagogue [il-synagogue-31.8599-34.82318] |
| גן שלמה (קבוצת שילר) (il-31.8777-34.7983) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חבצלת (il-31.8755-34.8154) | flat | 0 → 0 → synagogue [il-synagogue-31.88813-34.79295] → 0 | 0 → 0 → synagogue [il-synagogue-31.88813-34.79295] → 0 |
| כפר ביל"ו (il-31.8775-34.8203) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר ביל״ו ב׳ (il-31.8714-34.8279) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מילצ'ן (il-31.8822-34.8128) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין גנים (il-31.8819-34.8156) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גיבתון (il-31.8888-34.7995) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| היובל (il-31.8877-34.8261) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קרית ההגנה (il-31.8862-34.8302) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גני יוחנן (il-31.8603-34.8407) | flat | 0 → synagogue [il-synagogue-31.85568-34.82702] → synagogue [il-synagogue-31.85568-34.82702]; synagogue [il-synagogue-31.85692-34.82309] → synagogue [il-synagogue-31.85692-34.82309] | 0 → synagogue [il-synagogue-31.85568-34.82702] → synagogue [il-synagogue-31.85568-34.82702]; synagogue [il-synagogue-31.85692-34.82309] → synagogue [il-synagogue-31.85568-34.82702]; synagogue [il-synagogue-31.85692-34.82309] |
| מזכרת בתיה (il-31.8514-34.8412) | flat | synagogue [il-synagogue-31.85517-34.84083] → synagogue [il-synagogue-31.85517-34.84083]; synagogue [il-synagogue-31.85881-34.8271]; synagogue [il-synagogue-31.86199-34.82083] → synagogue [il-synagogue-31.85517-34.84083]; synagogue [il-synagogue-31.85881-34.8271]; synagogue [il-synagogue-31.8599-34.82318] → synagogue [il-synagogue-31.85517-34.84083] | synagogue [il-synagogue-31.85517-34.84083] → synagogue [il-synagogue-31.85517-34.84083]; synagogue [il-synagogue-31.85881-34.8271]; synagogue [il-synagogue-31.86199-34.82083] → synagogue [il-synagogue-31.85517-34.84083]; synagogue [il-synagogue-31.85568-34.82702]; synagogue [il-synagogue-31.85881-34.8271] → synagogue [il-synagogue-31.85517-34.84083] |
| טירת שלום (il-31.9093-34.7854) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נס ציונה (il-31.9296-34.7991) | flat | synagogue [il-synagogue-31.9269-34.79572] → synagogue [il-synagogue-31.9269-34.79572] → synagogue [il-synagogue-31.9269-34.79572] → synagogue [il-synagogue-31.9269-34.79572] | synagogue [il-synagogue-31.9269-34.79572] → synagogue [il-synagogue-31.9269-34.79572] → synagogue [il-synagogue-31.9269-34.79572] → synagogue [il-synagogue-31.9269-34.79572] |
| נצר סרני (il-31.9231-34.8240) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 |
| ראשון לציון (il-31.9636-34.8101) | flat | synagogue [il-synagogue-31.96435-34.80776] → synagogue [il-synagogue-31.96435-34.80776] → synagogue [il-synagogue-31.96435-34.80776] → synagogue [il-synagogue-31.96435-34.80776] | synagogue [il-synagogue-31.96435-34.80776] → synagogue [il-synagogue-31.96435-34.80776] → synagogue [il-synagogue-31.96435-34.80776] → synagogue [il-synagogue-31.96435-34.80776] |
| גאליה (il-31.8847-34.7648) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| באר יעקב (il-31.9444-34.8399) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אירוס (il-31.9285-34.7759) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית עובד (il-31.9213-34.7738) | flat | 0 → synagogue [il-synagogue-31.91386-34.78816] → synagogue [il-synagogue-31.91386-34.78816] → 0 | 0 → synagogue [il-synagogue-31.91386-34.78816] → synagogue [il-synagogue-31.91386-34.78816] → synagogue [il-synagogue-31.91386-34.78816] |
| בית חנן (il-31.9338-34.7740) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עיינות (il-31.9159-34.7678) | flat | 0 → 0 → synagogue [il-synagogue-31.91386-34.78816] → synagogue [il-synagogue-31.91386-34.78816] | 0 → 0 → synagogue [il-synagogue-31.91386-34.78816] → synagogue [il-synagogue-31.91386-34.78816] |
| נטעים (il-31.9444-34.7744) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמלה (il-31.9280-34.8623) | flat | minaret [il-minaret-31.92158-34.85032]; synagogue [il-synagogue-31.9289-34.86325] → minaret [il-minaret-31.92158-34.85032]; synagogue [il-synagogue-31.9289-34.86325] → minaret [il-minaret-31.92158-34.85032]; synagogue [il-synagogue-31.9289-34.86325] → minaret [il-minaret-31.92158-34.85032]; synagogue [il-synagogue-31.9289-34.86325] | minaret [il-minaret-31.92158-34.85032]; synagogue [il-synagogue-31.9289-34.86325] → minaret [il-minaret-31.92158-34.85032]; synagogue [il-synagogue-31.9289-34.86325] → minaret [il-minaret-31.92158-34.85032]; synagogue [il-synagogue-31.9289-34.86325] → minaret [il-minaret-31.92158-34.85032]; synagogue [il-synagogue-31.9289-34.86325] |
| ניר צבי (il-31.9514-34.8610) | flat | 0 → 0 → synagogue [il-synagogue-31.96018-34.87642] → 0 | 0 → 0 → synagogue [il-synagogue-31.95194-34.88629]; synagogue [il-synagogue-31.96018-34.87642] → synagogue [il-synagogue-31.95194-34.88629] |
| ישרש (il-31.9158-34.8499) | flat | minaret [il-minaret-31.92158-34.85032] → minaret [il-minaret-31.92158-34.85032] → minaret [il-minaret-31.92158-34.85032] → minaret [il-minaret-31.92158-34.85032] | minaret [il-minaret-31.92158-34.85032] → minaret [il-minaret-31.92158-34.85032] → minaret [il-minaret-31.92158-34.85032] → minaret [il-minaret-31.92158-34.85032] |
| אבו ליבדה (il-31.9720-34.8457) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גן שורק (il-31.9447-34.7599) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דהמש (il-31.9437-34.8671) | flat | 0 → 0 → synagogue [il-synagogue-31.94454-34.88611] → 0 | 0 → 0 → synagogue [il-synagogue-31.94454-34.88611] → synagogue [il-synagogue-31.94247-34.87552]; synagogue [il-synagogue-31.94454-34.88611] |
| בית דגן (il-32.0019-34.8302) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מצליח (il-31.9062-34.8718) | flat | synagogue [il-synagogue-31.90362-34.87718] → synagogue [il-synagogue-31.90362-34.87718] → synagogue [il-synagogue-31.90362-34.87718] → synagogue [il-synagogue-31.90362-34.87718] | synagogue [il-synagogue-31.90362-34.87718] → synagogue [il-synagogue-31.90362-34.87718] → synagogue [il-synagogue-31.90362-34.87718] → synagogue [il-synagogue-31.90362-34.87718] |
| לוד (il-31.9489-34.8885) | flat | minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.95194-34.88629] → minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.95194-34.88629] → minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.95194-34.88629] → minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.95194-34.88629] | minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.95194-34.88629] → minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.95194-34.88629] → minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.95194-34.88629] → minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.95194-34.88629] |
| בת ים (il-32.0155-34.7505) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חולון (il-32.0193-34.7804) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זיתן (il-31.9754-34.8914) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 |
| אחיסמך (il-31.9356-34.9081) | flat | synagogue [il-synagogue-31.93899-34.90168] → synagogue [il-synagogue-31.93899-34.90168] → synagogue [il-synagogue-31.93899-34.90168] → synagogue [il-synagogue-31.93899-34.90168] | synagogue [il-synagogue-31.93899-34.90168] → synagogue [il-synagogue-31.93899-34.90168] → synagogue [il-synagogue-31.93899-34.90168] → synagogue [il-synagogue-31.93899-34.90168] |
| אחיעזר (il-31.9811-34.8717) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 |
| אזור (il-32.0282-34.8026) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תל אביב–יפו (il-32.0853-34.7818) | flat | minaret [il-minaret-32.06637-34.76342] → minaret [il-minaret-32.06637-34.76342] → minaret [il-minaret-32.06637-34.76342] → minaret [il-minaret-32.06637-34.76342] | minaret [il-minaret-32.06637-34.76342] → minaret [il-minaret-32.06637-34.76342] → minaret [il-minaret-32.06637-34.76342] → minaret [il-minaret-32.06637-34.76342] |
| יגל (il-31.9870-34.8806) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 |
| כפר חב"ד (il-31.9886-34.8474) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעתיים (il-32.0730-34.8113) | flat | 0 → 0 → synagogue [il-synagogue-32.08361-34.83335] → 0 | 0 → 0 → synagogue [il-synagogue-32.08361-34.83335] → 0 |
| בניין אגף ההנדסה רמת גן (il-32.0817-34.8130) | flat | synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] | synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] → synagogue [il-synagogue-32.08155-34.81205] |
| בני ברק (il-32.0874-34.8324) | flat | synagogue [il-synagogue-32.08601-34.83558] → synagogue [il-synagogue-32.08601-34.83558] → synagogue [il-synagogue-32.08601-34.83558] → synagogue [il-synagogue-32.08601-34.83558] | synagogue [il-synagogue-32.08601-34.83558] → synagogue [il-synagogue-32.08601-34.83558] → synagogue [il-synagogue-32.08601-34.83558] → synagogue [il-synagogue-32.08601-34.83558] |
| משמר השבעה (il-32.0092-34.8234) | flat | minaret [il-minaret-32.03751-34.74781] → 0 → 0 → 0 | minaret [il-minaret-32.03751-34.74781] → 0 → 0 → 0 |
| גנות (il-32.0190-34.8267) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמת השרון (il-32.1431-34.8381) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חמ"ד (il-32.0191-34.8412) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אור יהודה (il-32.0270-34.8630) | flat | minaret [il-minaret-32.03092-34.88901]; synagogue [il-synagogue-32.0284-34.85734] → synagogue [il-synagogue-32.0284-34.85734] → synagogue [il-synagogue-32.0284-34.85734] → synagogue [il-synagogue-32.0284-34.85734] | minaret [il-minaret-32.03092-34.88901]; synagogue [il-synagogue-32.0284-34.85734] → synagogue [il-synagogue-32.0284-34.85734] → synagogue [il-synagogue-32.0284-34.85734] → synagogue [il-synagogue-32.0284-34.85734] |
| גליל ים (il-32.1569-34.8300) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת שמואל (il-32.0769-34.8525) | flat | 0 → 0 → synagogue [il-synagogue-32.08601-34.83558] → 0 | 0 → 0 → synagogue [il-synagogue-32.08601-34.83558] → 0 |
| הרצליה (il-32.1656-34.8469) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קריית אונו (il-32.0592-34.8594) | flat | minaret [il-minaret-32.03092-34.88901] → 0 → 0 → 0 | minaret [il-minaret-32.03092-34.88901] → 0 → 0 → 0 |
| פתח תקווה (il-32.0878-34.8860) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר שמריהו (il-32.1854-34.8198) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רעננה (il-32.1860-34.8678) | flat | synagogue [il-synagogue-32.17973-34.8768] → synagogue [il-synagogue-32.17973-34.8768] → synagogue [il-synagogue-32.17973-34.8768] → synagogue [il-synagogue-32.17973-34.8768] | synagogue [il-synagogue-32.17973-34.8768] → synagogue [il-synagogue-32.17973-34.8768] → synagogue [il-synagogue-32.17973-34.8768] → synagogue [il-synagogue-32.17973-34.8768] |
| סביון (il-32.0475-34.8799) | flat | 0 → 0 → synagogue [il-synagogue-32.0571-34.86204]; synagogue [il-synagogue-32.06216-34.85375] → 0 | 0 → 0 → synagogue [il-synagogue-32.0571-34.86204]; synagogue [il-synagogue-32.06216-34.85375] → 0 |
| גני תקווה (il-32.0604-34.8761) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רשפון (il-32.1996-34.8244) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת ח"ן (il-32.1686-34.8761) | flat | minaret [il-minaret-32.18783-34.80582] → synagogue [il-synagogue-32.1613-34.86194] → synagogue [il-synagogue-32.1613-34.86194]; synagogue [il-synagogue-32.16801-34.85935] → synagogue [il-synagogue-32.15892-34.89581] | minaret [il-minaret-32.18783-34.80582] → synagogue [il-synagogue-32.1613-34.86194] → synagogue [il-synagogue-32.1613-34.86194]; synagogue [il-synagogue-32.16801-34.85935] → synagogue [il-synagogue-32.15892-34.89581] |
| הוד השרון (il-32.1562-34.8930) | flat | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 |
| גני יהודה (il-32.0403-34.8773) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ארסוף קדם (il-32.2060-34.8207) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יהוד מונוסון (il-32.0332-34.8907) | flat | minaret [il-minaret-32.03092-34.88901] → minaret [il-minaret-32.03092-34.88901] → minaret [il-minaret-32.03092-34.88901]; synagogue [il-synagogue-32.03618-34.85517] → minaret [il-minaret-32.03092-34.88901] | minaret [il-minaret-32.03092-34.88901] → minaret [il-minaret-32.03092-34.88901] → minaret [il-minaret-32.03092-34.88901]; synagogue [il-synagogue-32.03618-34.85517] → minaret [il-minaret-32.03092-34.88901]; synagogue [il-synagogue-32.03618-34.85517] |
| גת רימון (il-32.0674-34.8805) | flat | 0 → 0 → synagogue [il-synagogue-32.07233-34.8916]; synagogue [il-synagogue-32.07409-34.89586] → 0 | 0 → 0 → synagogue [il-synagogue-32.07233-34.8916]; synagogue [il-synagogue-32.07409-34.89586] → 0 |
| רמות השבים (il-32.1662-34.8860) | flat | minaret [il-minaret-32.18783-34.80582] → synagogue [il-synagogue-32.15892-34.89581] → synagogue [il-synagogue-32.15892-34.89581]; synagogue [il-synagogue-32.16801-34.85935] → synagogue [il-synagogue-32.15892-34.89581] | minaret [il-minaret-32.18783-34.80582] → synagogue [il-synagogue-32.15892-34.89581] → synagogue [il-synagogue-32.15892-34.89581]; synagogue [il-synagogue-32.16801-34.85935] → synagogue [il-synagogue-32.15892-34.89581]; synagogue [il-synagogue-32.16801-34.85935] |
| כפר מעש (il-32.0652-34.8875) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר סבא (il-32.1773-34.9075) | flat | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 |
| כפר מל"ל (il-32.1671-34.8935) | flat | minaret [il-minaret-32.18783-34.80582] → synagogue [il-synagogue-32.1613-34.86194] → synagogue [il-synagogue-32.1613-34.86194]; synagogue [il-synagogue-32.1718-34.9045] → 0 | minaret [il-minaret-32.18783-34.80582] → synagogue [il-synagogue-32.1613-34.86194] → synagogue [il-synagogue-32.1613-34.86194]; synagogue [il-synagogue-32.1718-34.9045] → 0 |
| ירקונה (il-32.1460-34.8988) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עדנים (il-32.1383-34.9083) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גן חיים (il-32.1951-34.9055) | flat | minaret [il-minaret-32.18783-34.80582] → synagogue [il-synagogue-32.18996-34.93738] → synagogue [il-synagogue-32.18599-34.93616]; synagogue [il-synagogue-32.18996-34.93738] → synagogue [il-synagogue-32.18599-34.93616]; synagogue [il-synagogue-32.18996-34.93738] | minaret [il-minaret-32.18783-34.80582] → synagogue [il-synagogue-32.18599-34.93616]; synagogue [il-synagogue-32.18996-34.93738] → synagogue [il-synagogue-32.18599-34.93616]; synagogue [il-synagogue-32.18996-34.93738] → synagogue [il-synagogue-32.18599-34.93616]; synagogue [il-synagogue-32.18996-34.93738] |
| גני עם (il-32.1514-34.9017) | flat | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 |
| נחלים (il-32.0590-34.9136) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר סירקין (il-32.0777-34.9235) | flat | 0 → 0 → synagogue [il-synagogue-32.08068-34.8958]; synagogue [il-synagogue-32.08593-34.90407] → 0 | 0 → 0 → synagogue [il-synagogue-32.08068-34.8958]; synagogue [il-synagogue-32.08593-34.90407] → synagogue [il-synagogue-32.08068-34.8958] |
| צופית (il-32.1918-34.9231) | flat | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 |
| אלישמע (il-32.1520-34.9279) | flat | minaret [il-minaret-32.15465-34.9497]; minaret [il-minaret-32.15574-34.95406]; minaret [il-minaret-32.18783-34.80582] → 0 → minaret [il-minaret-32.15465-34.9497]; minaret [il-minaret-32.15574-34.95406] → 0 | minaret [il-minaret-32.15465-34.9497]; minaret [il-minaret-32.15574-34.95406]; minaret [il-minaret-32.18783-34.80582] → 0 → minaret [il-minaret-32.15465-34.9497]; minaret [il-minaret-32.15574-34.95406] → 0 |
| שדה ורבורג (il-32.2094-34.9048) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נוה ימין (il-32.1719-34.9388) | flat | minaret [il-minaret-32.17925-34.94469]; minaret [il-minaret-32.18783-34.80582] → minaret [il-minaret-32.17925-34.94469] → minaret [il-minaret-32.17925-34.94469]; synagogue [il-synagogue-32.18365-34.90919] → minaret [il-minaret-32.17925-34.94469] | minaret [il-minaret-32.17925-34.94469]; minaret [il-minaret-32.18783-34.80582] → minaret [il-minaret-32.17925-34.94469] → minaret [il-minaret-32.17925-34.94469]; synagogue [il-synagogue-32.18365-34.90919] → minaret [il-minaret-32.17925-34.94469] |
| בניה (il-31.8435-34.7536) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בן זכאי (il-31.8569-34.7296) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יבנה (il-31.8769-34.7383) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר הנגיד (il-31.8867-34.7496) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יסודות (il-31.8149-34.8662) | flat | synagogue [il-synagogue-31.81508-34.86655] → synagogue [il-synagogue-31.81508-34.86655] → synagogue [il-synagogue-31.81508-34.86655] → synagogue [il-synagogue-31.81508-34.86655] | synagogue [il-synagogue-31.81508-34.86655] → synagogue [il-synagogue-31.81508-34.86655] → synagogue [il-synagogue-31.81508-34.86655] → synagogue [il-synagogue-31.81508-34.86655] |
| נצר חזני (il-31.8216-34.8625) | flat | synagogue [il-synagogue-31.82208-34.86283] → synagogue [il-synagogue-31.82208-34.86283] → synagogue [il-synagogue-31.82208-34.86283] → synagogue [il-synagogue-31.82208-34.86283] | synagogue [il-synagogue-31.82208-34.86283] → synagogue [il-synagogue-31.82208-34.86283] → synagogue [il-synagogue-31.82208-34.86283] → synagogue [il-synagogue-31.82208-34.86283] |
| משמר דוד (il-31.8225-34.9009) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חולדה (il-31.8311-34.8828) | flat | synagogue [il-synagogue-31.81544-34.77392]; synagogue [il-synagogue-31.86954-34.98559] → 0 → 0 → 0 | synagogue [il-synagogue-31.81544-34.77392]; synagogue [il-synagogue-31.86954-34.98559] → 0 → 0 → 0 |
| פתחיה (il-31.8676-34.8863) | flat | synagogue [il-synagogue-31.86954-34.98559]; synagogue [il-synagogue-31.89042-34.81733] → 0 → 0 → 0 | synagogue [il-synagogue-31.86954-34.98559]; synagogue [il-synagogue-31.89042-34.81733] → 0 → 0 → 0 |
| יציץ (il-31.8623-34.8629) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמות מאיר (il-31.8746-34.8558) | flat | 0 → 0 → synagogue [il-synagogue-31.86621-34.82353] → 0 | 0 → synagogue [il-synagogue-31.86621-34.82353] → synagogue [il-synagogue-31.86621-34.82353] → 0 |
| גני הדר (il-31.8793-34.8530) | flat | minaret [il-minaret-31.92913-34.73364] → 0 → synagogue [il-synagogue-31.89393-34.82404] → 0 | minaret [il-minaret-31.92913-34.73364] → 0 → synagogue [il-synagogue-31.89393-34.82404] → 0 |
| נען (il-31.8838-34.8571) | flat | minaret [il-minaret-31.92913-34.73364] → 0 → synagogue [il-synagogue-31.89393-34.82404] → 0 | minaret [il-minaret-31.92913-34.73364] → 0 → synagogue [il-synagogue-31.89393-34.82404] → 0 |
| סתריה (il-31.8919-34.8441) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית עוזיאל (il-31.8694-34.9052) | flat | synagogue [il-synagogue-31.86954-34.98559] → 0 → 0 → 0 | synagogue [il-synagogue-31.86954-34.98559] → 0 → 0 → 0 |
| יד רמב"ם (il-31.8994-34.9008) | flat | minaret [il-minaret-31.92913-34.73364]; synagogue [il-synagogue-31.89576-34.8168] → 0 → 0 → 0 | minaret [il-minaret-31.92913-34.73364]; synagogue [il-synagogue-31.89576-34.8168] → 0 → 0 → 0 |
| עזריה (il-31.8905-34.9116) | flat | synagogue [il-synagogue-31.9269-34.79572] → 0 → 0 → 0 | synagogue [il-synagogue-31.9269-34.79572] → 0 → 0 → 0 |
| בית חשמונאי (il-31.8880-34.9190) | flat | synagogue [il-synagogue-31.9269-34.79572] → 0 → 0 → 0 | synagogue [il-synagogue-31.9269-34.79572] → 0 → 0 → 0 |
| כפר שמואל (il-31.8891-34.9328) | flat | synagogue [il-synagogue-31.9269-34.79572] → 0 → 0 → 0 | synagogue [il-synagogue-31.9269-34.79572] → 0 → 0 → 0 |
| משמר איילון (il-31.8719-34.9448) | flat | synagogue [il-synagogue-31.89042-34.81733] → 0 → 0 → 0 | synagogue [il-synagogue-31.89042-34.81733] → 0 → 0 → 0 |
| Kfar Bin Nun (il-31.8625-34.9472) | flat | synagogue [il-synagogue-31.89042-34.81733] → 0 → 0 → 0 | synagogue [il-synagogue-31.89042-34.81733] → 0 → 0 → 0 |
| צלפון (il-31.8041-34.9327) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גיזו (il-31.8041-34.9381) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| הראל (il-31.8094-34.9491) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נוה שלום (il-31.8175-34.9782) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בקוע (il-31.8294-34.9270) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נחשון (il-31.8310-34.9559) | flat | synagogue [il-synagogue-31.89042-34.81733] → 0 → 0 → 0 | synagogue [il-synagogue-31.89042-34.81733] → 0 → 0 → 0 |
| כרמי יוסף (il-31.8470-34.9205) | flat | synagogue [il-synagogue-31.86954-34.98559] → 0 → 0 → 0 | synagogue [il-synagogue-31.86954-34.98559] → 0 → 0 → 0 |
| שעלבים (il-31.8700-34.9839) | flat | synagogue [il-synagogue-31.86905-34.98188]; synagogue [il-synagogue-31.86954-34.98559] → synagogue [il-synagogue-31.86905-34.98188]; synagogue [il-synagogue-31.86954-34.98559] → synagogue [il-synagogue-31.86905-34.98188]; synagogue [il-synagogue-31.86954-34.98559] → synagogue [il-synagogue-31.86905-34.98188]; synagogue [il-synagogue-31.86954-34.98559] | synagogue [il-synagogue-31.86905-34.98188]; synagogue [il-synagogue-31.86954-34.98559] → synagogue [il-synagogue-31.86905-34.98188]; synagogue [il-synagogue-31.86954-34.98559] → synagogue [il-synagogue-31.86905-34.98188]; synagogue [il-synagogue-31.86954-34.98559] → synagogue [il-synagogue-31.86905-34.98188]; synagogue [il-synagogue-31.86954-34.98559] |
| נוף איילון (il-31.8705-34.9897) | flat | synagogue [il-synagogue-31.87138-34.99328] → synagogue [il-synagogue-31.87138-34.99328] → synagogue [il-synagogue-31.87138-34.99328] → synagogue [il-synagogue-31.87138-34.99328] | synagogue [il-synagogue-31.87138-34.99328] → synagogue [il-synagogue-31.87138-34.99328] → synagogue [il-synagogue-31.87138-34.99328] → synagogue [il-synagogue-31.87138-34.99328] |
| גזר (il-31.8770-34.9209) | flat | synagogue [il-synagogue-31.86954-34.98559]; synagogue [il-synagogue-31.87668-34.91999] → synagogue [il-synagogue-31.87668-34.91999] → synagogue [il-synagogue-31.87668-34.91999] → synagogue [il-synagogue-31.87668-34.91999] | synagogue [il-synagogue-31.86954-34.98559]; synagogue [il-synagogue-31.87668-34.91999] → synagogue [il-synagogue-31.87668-34.91999] → synagogue [il-synagogue-31.87668-34.91999] → synagogue [il-synagogue-31.87668-34.91999] |
| מודיעין-מכבים-רעות (il-31.9086-35.0069) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 |
| שילת (il-31.9206-35.0173) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 |
| חוות שער הגיא הנטושה (il-31.8036-35.0451) | flat | minaret [il-minaret-31.80387-35.05] → minaret [il-minaret-31.80387-35.05] → minaret [il-minaret-31.80387-35.05] → minaret [il-minaret-31.80387-35.05] | minaret [il-minaret-31.80387-35.05] → minaret [il-minaret-31.80387-35.05] → minaret [il-minaret-31.80387-35.05] → minaret [il-minaret-31.80387-35.05] |
| נטף (il-31.8320-35.0680) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חראייב אום אל-לחם (il-31.8382-35.0955) | flat | minaret [il-minaret-31.8395-35.09457] → minaret [il-minaret-31.8395-35.09457] → minaret [il-minaret-31.8395-35.09457] → minaret [il-minaret-31.8395-35.09457] | minaret [il-minaret-31.8395-35.09457] → minaret [il-minaret-31.8395-35.09457] → minaret [il-minaret-31.8395-35.09457] → minaret [il-minaret-31.8395-35.09457] |
| מבוא חורון (il-31.8502-35.0355) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית ליקיא (il-31.8694-35.0662) | flat | minaret [il-minaret-31.87115-35.06238]; synagogue [il-synagogue-31.86954-34.98559] → minaret [il-minaret-31.87115-35.06238] → minaret [il-minaret-31.87115-35.06238] → minaret [il-minaret-31.87115-35.06238] | minaret [il-minaret-31.87115-35.06238]; synagogue [il-synagogue-31.86954-34.98559] → minaret [il-minaret-31.87115-35.06238] → minaret [il-minaret-31.87115-35.06238] → minaret [il-minaret-31.87115-35.06238] |
| בית סירא (il-31.8878-35.0444) | flat | minaret [il-minaret-31.88744-35.04385] → minaret [il-minaret-31.88744-35.04385] → minaret [il-minaret-31.88744-35.04385]; synagogue [il-synagogue-31.89741-35.01455]; synagogue [il-synagogue-31.90324-35.0135] → minaret [il-minaret-31.88744-35.04385] | minaret [il-minaret-31.88744-35.04385] → minaret [il-minaret-31.88744-35.04385] → minaret [il-minaret-31.88744-35.04385]; synagogue [il-synagogue-31.89741-35.01455]; synagogue [il-synagogue-31.90324-35.0135] → minaret [il-minaret-31.88744-35.04385] |
| ח'ירבת אל מיסבאח (il-31.8851-35.0725) | flat | minaret [il-minaret-31.88433-35.06723]; minaret [il-minaret-31.88594-35.07473]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.88433-35.06723]; minaret [il-minaret-31.88594-35.07473] → minaret [il-minaret-31.88433-35.06723]; minaret [il-minaret-31.88594-35.07473] → minaret [il-minaret-31.88433-35.06723]; minaret [il-minaret-31.88594-35.07473] | minaret [il-minaret-31.88433-35.06723]; minaret [il-minaret-31.88594-35.07473]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.88433-35.06723]; minaret [il-minaret-31.88594-35.07473] → minaret [il-minaret-31.88433-35.06723]; minaret [il-minaret-31.88594-35.07473] → minaret [il-minaret-31.88433-35.06723]; minaret [il-minaret-31.88594-35.07473] |
| בית עור א-תחתא (il-31.8958-35.0850) | flat | minaret [il-minaret-31.89489-35.08544]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.89489-35.08544] → minaret [il-minaret-31.89489-35.08544] → minaret [il-minaret-31.89489-35.08544] | minaret [il-minaret-31.89489-35.08544]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.89489-35.08544] → minaret [il-minaret-31.89489-35.08544] → minaret [il-minaret-31.89489-35.08544] |
| ספא (il-31.9066-35.0594) | flat | minaret [il-minaret-31.90707-35.05841]; minaret [il-minaret-31.95297-34.89942] → minaret [il-minaret-31.90707-35.05841] → minaret [il-minaret-31.90707-35.05841] → minaret [il-minaret-31.90707-35.05841] | minaret [il-minaret-31.90707-35.05841]; minaret [il-minaret-31.95297-34.89942] → minaret [il-minaret-31.90707-35.05841] → minaret [il-minaret-31.90707-35.05841] → minaret [il-minaret-31.90707-35.05841] |
| בית איכסא (il-31.8179-35.1799) | flat | minaret [il-minaret-31.81663-35.18102] → minaret [il-minaret-31.81663-35.18102] → minaret [il-minaret-31.81663-35.18102]; synagogue [il-synagogue-31.82473-35.19254] → minaret [il-minaret-31.81663-35.18102] | minaret [il-minaret-31.81663-35.18102] → minaret [il-minaret-31.81663-35.18102] → minaret [il-minaret-31.81663-35.18102]; synagogue [il-synagogue-31.82473-35.19254] → minaret [il-minaret-31.81663-35.18102] |
| נבי סמואל - כפר (il-31.8338-35.1840) | flat | minaret [il-minaret-31.80386-35.11386] → synagogue [il-synagogue-31.82473-35.19254] → synagogue [il-synagogue-31.82473-35.19254] → synagogue [il-synagogue-31.82473-35.19254] | minaret [il-minaret-31.80386-35.11386] → synagogue [il-synagogue-31.82473-35.19254] → synagogue [il-synagogue-31.82473-35.19254] → synagogue [il-synagogue-31.82196-35.19443]; synagogue [il-synagogue-31.82473-35.19254] |
| א-נבי סימואיל בדואים (il-31.8359-35.1868) | flat | minaret [il-minaret-31.80386-35.11386]; westernWall [jerusalem-wall] → synagogue [il-synagogue-31.81638-35.20685] → synagogue [il-synagogue-31.81638-35.20685] → synagogue [il-synagogue-31.81638-35.20685] | minaret [il-minaret-31.80386-35.11386]; westernWall [jerusalem-wall] → synagogue [il-synagogue-31.81638-35.20685]; synagogue [il-synagogue-31.82196-35.19443] → synagogue [il-synagogue-31.81638-35.20685]; synagogue [il-synagogue-31.82196-35.19443] → synagogue [il-synagogue-31.81638-35.20685]; synagogue [il-synagogue-31.82196-35.19443] |
| בית ענאן (il-31.8511-35.1121) | flat | minaret [il-minaret-31.85287-35.11145]; minaret [il-minaret-31.85669-35.10438] → minaret [il-minaret-31.85287-35.11145]; minaret [il-minaret-31.85669-35.10438] → minaret [il-minaret-31.85287-35.11145]; minaret [il-minaret-31.85669-35.10438] → minaret [il-minaret-31.85287-35.11145]; minaret [il-minaret-31.85669-35.10438] | minaret [il-minaret-31.85287-35.11145]; minaret [il-minaret-31.85669-35.10438] → minaret [il-minaret-31.85287-35.11145]; minaret [il-minaret-31.85669-35.10438] → minaret [il-minaret-31.85287-35.11145]; minaret [il-minaret-31.85669-35.10438] → minaret [il-minaret-31.85287-35.11145]; minaret [il-minaret-31.85669-35.10438] |
| בית דוקו (il-31.8582-35.1325) | flat | minaret [il-minaret-31.8592-35.13064] → minaret [il-minaret-31.8592-35.13064] → minaret [il-minaret-31.8592-35.13064]; synagogue [il-synagogue-31.86547-35.15081] → minaret [il-minaret-31.8592-35.13064] | minaret [il-minaret-31.8592-35.13064] → minaret [il-minaret-31.8592-35.13064] → minaret [il-minaret-31.8592-35.13064]; synagogue [il-synagogue-31.86547-35.15081] → minaret [il-minaret-31.8592-35.13064] |
| אל-טירה (il-31.8693-35.1234) | flat | minaret [il-minaret-31.8694-35.12617] → minaret [il-minaret-31.8694-35.12617]; synagogue [il-synagogue-31.86547-35.15081] → minaret [il-minaret-31.8694-35.12617]; synagogue [il-synagogue-31.86547-35.15081] → minaret [il-minaret-31.8694-35.12617]; synagogue [il-synagogue-31.86547-35.15081] | minaret [il-minaret-31.8694-35.12617] → minaret [il-minaret-31.8694-35.12617]; synagogue [il-synagogue-31.86547-35.15081] → minaret [il-minaret-31.8694-35.12617]; synagogue [il-synagogue-31.86547-35.15081] → minaret [il-minaret-31.8694-35.12617]; synagogue [il-synagogue-31.86547-35.15081] |
| בית חורון (il-31.8782-35.1268) | flat | minaret [il-minaret-31.90408-35.20741] → 0 → synagogue [il-synagogue-31.86547-35.15081] → synagogue [il-synagogue-31.86547-35.15081] | minaret [il-minaret-31.90408-35.20741] → 0 → synagogue [il-synagogue-31.86547-35.15081] → synagogue [il-synagogue-31.86547-35.15081] |
| בית עור אל-פוקא (il-31.8860-35.1148) | flat | minaret [il-minaret-31.88545-35.11459]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.88545-35.11459] → minaret [il-minaret-31.88545-35.11459] → minaret [il-minaret-31.88545-35.11459] | minaret [il-minaret-31.88545-35.11459]; minaret [il-minaret-31.90408-35.20741] → minaret [il-minaret-31.88545-35.11459] → minaret [il-minaret-31.88545-35.11459] → minaret [il-minaret-31.88545-35.11459] |
| אל-פקרא (il-31.8117-35.2993) | flat | minaret [il-minaret-31.81332-35.26149] → 0 → 0 → 0 | minaret [il-minaret-31.81332-35.26149] → 0 → 0 → 0 |
| עלמון (il-31.8316-35.2965) | flat | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 |
| מחמאס (il-31.8722-35.2775) | flat | minaret [il-minaret-31.87214-35.27728]; synagogue [il-synagogue-31.8121-35.39333] → minaret [il-minaret-31.87214-35.27728] → minaret [il-minaret-31.87214-35.27728] → minaret [il-minaret-31.87214-35.27728] | minaret [il-minaret-31.87214-35.27728]; synagogue [il-synagogue-31.8121-35.39333] → minaret [il-minaret-31.87214-35.27728] → minaret [il-minaret-31.87214-35.27728] → minaret [il-minaret-31.87214-35.27728] |
| מגרון (il-31.8742-35.2591) | flat | 0 → minaret [il-minaret-31.86765-35.22712] → minaret [il-minaret-31.86765-35.22712] → minaret [il-minaret-31.86765-35.22712] | 0 → minaret [il-minaret-31.86765-35.22712] → minaret [il-minaret-31.86765-35.22712] → minaret [il-minaret-31.86765-35.22712] |
| רמת מגרון (il-31.8861-35.2694) | flat | minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 | minaret [il-minaret-31.85678-35.2631]; minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 |
| בורקא (il-31.8953-35.2533) | flat | minaret [il-minaret-31.89272-35.20815]; minaret [il-minaret-31.89497-35.25369] → minaret [il-minaret-31.89497-35.25369] → minaret [il-minaret-31.89497-35.25369] → minaret [il-minaret-31.89497-35.25369] | minaret [il-minaret-31.89272-35.20815]; minaret [il-minaret-31.89497-35.25369] → minaret [il-minaret-31.89497-35.25369] → minaret [il-minaret-31.89497-35.25369] → minaret [il-minaret-31.89497-35.25369] |
| חוות חנינה (il-31.8945-35.3048) | flat | minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 | minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 |
| מצפה יריחו (il-31.8156-35.3943) | flat | synagogue [il-synagogue-31.8121-35.39333] → synagogue [il-synagogue-31.8121-35.39333] → synagogue [il-synagogue-31.8121-35.39333] → synagogue [il-synagogue-31.8121-35.39333] | synagogue [il-synagogue-31.8121-35.39333] → synagogue [il-synagogue-31.8121-35.39333] → synagogue [il-synagogue-31.8121-35.39333] → synagogue [il-synagogue-31.8121-35.39333] |
| נופי פרת (il-31.8238-35.3208) | flat | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 |
| כפר אדומים (il-31.8253-35.3352) | flat | minaret [il-minaret-31.77787-35.22965] → 0 → 0 → 0 | minaret [il-minaret-31.77787-35.22965] → 0 → 0 → 0 |
| אלון (il-31.8329-35.3534) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בני אדם (il-31.8449-35.3064) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מצפה חגית (il-31.8512-35.3381) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נווה ארז (il-31.8655-35.3109) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעלה מכמש (il-31.8789-35.3062) | flat | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.87729-35.30592] → minaret [il-minaret-31.87214-35.27728]; synagogue [il-synagogue-31.87729-35.30592] → minaret [il-minaret-31.87214-35.27728]; synagogue [il-synagogue-31.87729-35.30592] → minaret [il-minaret-31.87214-35.27728]; synagogue [il-synagogue-31.87729-35.30592] | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.87729-35.30592] → minaret [il-minaret-31.87214-35.27728]; synagogue [il-synagogue-31.87729-35.30592] → minaret [il-minaret-31.87214-35.27728]; synagogue [il-synagogue-31.87729-35.30592] → minaret [il-minaret-31.87214-35.27728]; synagogue [il-synagogue-31.87729-35.30592] |
| מצפה דני (il-31.8812-35.3144) | flat | minaret [il-minaret-31.87214-35.27728]; minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 | minaret [il-minaret-31.87214-35.27728]; minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 |
| קדם ערבה (il-31.8070-35.4995) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית הערבה (il-31.8087-35.4774) | flat | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 | synagogue [il-synagogue-31.8121-35.39333] → 0 → 0 → 0 |
| עקבת ג'בר (il-31.8395-35.4419) | flat | minaret [il-minaret-31.83705-35.44346]; minaret [il-minaret-31.8427-35.44021]; minaret [il-minaret-31.84384-35.43669] → minaret [il-minaret-31.83705-35.44346]; minaret [il-minaret-31.8427-35.44021]; minaret [il-minaret-31.84384-35.43669] → minaret [il-minaret-31.83705-35.44346]; minaret [il-minaret-31.8427-35.44021]; minaret [il-minaret-31.84384-35.43669] → minaret [il-minaret-31.83705-35.44346]; minaret [il-minaret-31.8427-35.44021]; minaret [il-minaret-31.84384-35.43669] | minaret [il-minaret-31.83705-35.44346]; minaret [il-minaret-31.8427-35.44021]; minaret [il-minaret-31.84384-35.43669] → minaret [il-minaret-31.83705-35.44346]; minaret [il-minaret-31.8427-35.44021]; minaret [il-minaret-31.84384-35.43669] → minaret [il-minaret-31.83705-35.44346]; minaret [il-minaret-31.8427-35.44021]; minaret [il-minaret-31.84384-35.43669] → minaret [il-minaret-31.83705-35.44346]; minaret [il-minaret-31.8427-35.44021]; minaret [il-minaret-31.84384-35.43669] |
| עין אל סולטן (il-31.8756-35.4455) | flat | minaret [il-minaret-31.87521-35.45098]; minaret [il-minaret-31.88187-35.45254] → minaret [il-minaret-31.87521-35.45098]; minaret [il-minaret-31.88187-35.45254] → minaret [il-minaret-31.87521-35.45098]; minaret [il-minaret-31.88187-35.45254] → minaret [il-minaret-31.87521-35.45098]; minaret [il-minaret-31.88187-35.45254] | minaret [il-minaret-31.87521-35.45098]; minaret [il-minaret-31.88187-35.45254] → minaret [il-minaret-31.87521-35.45098]; minaret [il-minaret-31.88187-35.45254] → minaret [il-minaret-31.87521-35.45098]; minaret [il-minaret-31.88187-35.45254] → minaret [il-minaret-31.87521-35.45098]; minaret [il-minaret-31.88187-35.45254] |
| ורד יריחו (il-31.8262-35.4324) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| بدوين (il-31.8976-35.4194) | flat | minaret [il-minaret-31.89095-35.43338] → minaret [il-minaret-31.89095-35.43338] → minaret [il-minaret-31.89095-35.43338] → minaret [il-minaret-31.89095-35.43338] | minaret [il-minaret-31.89095-35.43338] → minaret [il-minaret-31.89095-35.43338] → minaret [il-minaret-31.89095-35.43338] → minaret [il-minaret-31.89095-35.43338] |
| בית חוגלה (il-31.8211-35.5072) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פלמחים (il-31.9334-34.7073) | flat | synagogue [il-synagogue-31.96435-34.80776] → 0 → 0 → 0 | synagogue [il-synagogue-31.96435-34.80776] → 0 → 0 → 0 |
| צפריה (il-32.0053-34.8551) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר דניאל (il-31.9333-34.9326) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מבוא מודיעים (il-31.9345-34.9872) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 |
| בן שמן (il-31.9523-34.9219) | flat | synagogue [il-synagogue-31.96435-34.80776] → 0 → 0 → 0 | synagogue [il-synagogue-31.96435-34.80776] → 0 → 0 → 0 |
| כפר הנוער בן שמן (il-31.9593-34.9293) | flat | synagogue [il-synagogue-31.9269-34.79572]; synagogue [il-synagogue-31.96435-34.80776] → 0 → 0 → 0 | synagogue [il-synagogue-31.9269-34.79572]; synagogue [il-synagogue-31.96435-34.80776] → 0 → 0 → 0 |
| בודרוס (il-31.9661-34.9927) | flat | minaret [il-minaret-31.96578-34.99443] → minaret [il-minaret-31.96578-34.99443] → minaret [il-minaret-31.96578-34.99443] → minaret [il-minaret-31.96578-34.99443] | minaret [il-minaret-31.96578-34.99443] → minaret [il-minaret-31.96578-34.99443] → minaret [il-minaret-31.96578-34.99443] → minaret [il-minaret-31.96578-34.99443] |
| קיביא (il-31.9774-35.0112) | flat | minaret [il-minaret-31.97838-35.01137] → minaret [il-minaret-31.97838-35.01137] → minaret [il-minaret-31.97838-35.01137] → minaret [il-minaret-31.97838-35.01137] | minaret [il-minaret-31.97838-35.01137] → minaret [il-minaret-31.97838-35.01137] → minaret [il-minaret-31.97838-35.01137] → minaret [il-minaret-31.97838-35.01137] |
| חדיד (il-31.9683-34.9337) | flat | synagogue [il-synagogue-31.9269-34.79572]; synagogue [il-synagogue-31.96435-34.80776] → 0 → 0 → 0 | synagogue [il-synagogue-31.9269-34.79572]; synagogue [il-synagogue-31.96435-34.80776] → 0 → 0 → 0 |
| בית נחמיה (il-31.9758-34.9551) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שוהם (il-32.0005-34.9465) | flat | synagogue [il-synagogue-32.00177-34.94218] → synagogue [il-synagogue-32.00177-34.94218] → synagogue [il-synagogue-32.00177-34.94218] → synagogue [il-synagogue-32.00177-34.94218] | synagogue [il-synagogue-32.00177-34.94218] → synagogue [il-synagogue-32.00177-34.94218] → synagogue [il-synagogue-32.00177-34.94218] → synagogue [il-synagogue-32.00177-34.94218] |
| ברקת (il-32.0189-34.9438) | flat | synagogue [il-synagogue-32.01768-34.94412] → synagogue [il-synagogue-32.01768-34.94412] → synagogue [il-synagogue-32.01768-34.94412] → synagogue [il-synagogue-32.01768-34.94412] | synagogue [il-synagogue-32.01768-34.94412] → synagogue [il-synagogue-32.01768-34.94412] → synagogue [il-synagogue-32.01768-34.94412] → synagogue [il-synagogue-32.01768-34.94412] |
| טירת יהודה (il-32.0141-34.9334) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר טרומן (il-31.9806-34.9217) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר רות (il-31.9108-35.0358) | flat | minaret [il-minaret-31.95297-34.89942] → synagogue [il-synagogue-31.89741-35.01455] → synagogue [il-synagogue-31.89741-35.01455] → 0 | minaret [il-minaret-31.95297-34.89942] → synagogue [il-synagogue-31.89741-35.01455] → synagogue [il-synagogue-31.89741-35.01455] → synagogue [il-synagogue-31.89741-35.01455] |
| לפיד (il-31.9175-35.0319) | flat | minaret [il-minaret-31.95297-34.89942] → synagogue [il-synagogue-31.89741-35.01455] → synagogue [il-synagogue-31.89741-35.01455] → 0 | minaret [il-minaret-31.95297-34.89942] → synagogue [il-synagogue-31.89741-35.01455] → synagogue [il-synagogue-31.89741-35.01455] → synagogue [il-synagogue-31.89741-35.01455] |
| כפר האורנים (il-31.9198-35.0369) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 | minaret [il-minaret-31.95297-34.89942] → 0 → 0 → 0 |
| בילעין (il-31.9286-35.0720) | flat | minaret [il-minaret-31.92646-35.07083]; minaret [il-minaret-31.95297-34.89942] → minaret [il-minaret-31.92646-35.07083] → minaret [il-minaret-31.92646-35.07083] → minaret [il-minaret-31.92646-35.07083] | minaret [il-minaret-31.92646-35.07083]; minaret [il-minaret-31.95297-34.89942] → minaret [il-minaret-31.92646-35.07083] → minaret [il-minaret-31.92646-35.07083] → minaret [il-minaret-31.92646-35.07083] |
| כפר ניעמה (il-31.9271-35.0941) | flat | minaret [il-minaret-31.9246-35.09637]; minaret [il-minaret-31.92612-35.10397]; minaret [il-minaret-31.92885-35.09086]; synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.9246-35.09637]; minaret [il-minaret-31.92612-35.10397]; minaret [il-minaret-31.92885-35.09086] → minaret [il-minaret-31.9246-35.09637]; minaret [il-minaret-31.92612-35.10397]; minaret [il-minaret-31.92885-35.09086] → minaret [il-minaret-31.9246-35.09637]; minaret [il-minaret-31.92612-35.10397]; minaret [il-minaret-31.92885-35.09086] | minaret [il-minaret-31.9246-35.09637]; minaret [il-minaret-31.92612-35.10397]; minaret [il-minaret-31.92885-35.09086]; synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.9246-35.09637]; minaret [il-minaret-31.92612-35.10397]; minaret [il-minaret-31.92885-35.09086] → minaret [il-minaret-31.9246-35.09637]; minaret [il-minaret-31.92612-35.10397]; minaret [il-minaret-31.92885-35.09086] → minaret [il-minaret-31.9246-35.09637]; minaret [il-minaret-31.92612-35.10397]; minaret [il-minaret-31.92885-35.09086] |
| מודיעין עילית (il-31.9324-35.0433) | flat | synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92922-35.04517] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92922-35.04517] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92922-35.04517] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92922-35.04517] | synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92922-35.04517] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92922-35.04517] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92922-35.04517] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92922-35.04517] |
| מתתיהו (il-31.9298-35.0346) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → synagogue [il-synagogue-31.93044-35.01592] → synagogue [il-synagogue-31.92948-35.02155]; synagogue [il-synagogue-31.93044-35.01592] | minaret [il-minaret-31.95297-34.89942] → 0 → synagogue [il-synagogue-31.92948-35.02155]; synagogue [il-synagogue-31.93044-35.01592] → synagogue [il-synagogue-31.92948-35.02155]; synagogue [il-synagogue-31.93044-35.01592] |
| דיר קדיס (il-31.9488-35.0457) | flat | minaret [il-minaret-31.94902-35.04479]; minaret [il-minaret-31.95297-34.89942] → minaret [il-minaret-31.94902-35.04479]; synagogue [il-synagogue-31.93044-35.01592] → minaret [il-minaret-31.94902-35.04479]; synagogue [il-synagogue-31.93044-35.01592] → minaret [il-minaret-31.94902-35.04479] | minaret [il-minaret-31.94902-35.04479]; minaret [il-minaret-31.95297-34.89942] → minaret [il-minaret-31.94902-35.04479]; synagogue [il-synagogue-31.93044-35.01592] → minaret [il-minaret-31.94902-35.04479]; synagogue [il-synagogue-31.93044-35.01592] → minaret [il-minaret-31.94902-35.04479] |
| חשמונאים (il-31.9312-35.0224) | flat | minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92948-35.02155] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92948-35.02155] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92948-35.02155]; synagogue [il-synagogue-31.93044-35.01592] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92948-35.02155] | minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92948-35.02155] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92948-35.02155] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92948-35.02155]; synagogue [il-synagogue-31.93044-35.01592] → synagogue [il-synagogue-31.92898-35.0272]; synagogue [il-synagogue-31.92948-35.02155] |
| גני מודיעין (il-31.9295-35.0173) | flat | minaret [il-minaret-31.95297-34.89942] → 0 → synagogue [il-synagogue-31.93358-35.02602] → 0 | minaret [il-minaret-31.95297-34.89942] → 0 → synagogue [il-synagogue-31.93358-35.02602] → 0 |
| ח'ירבת בני חארת (il-31.9465-35.0724) | flat | minaret [il-minaret-31.94417-35.07129]; minaret [il-minaret-31.94889-35.07338]; minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.94417-35.07129]; minaret [il-minaret-31.94889-35.07338] → minaret [il-minaret-31.94417-35.07129]; minaret [il-minaret-31.94889-35.07338]; minaret [il-minaret-31.94902-35.04479] → minaret [il-minaret-31.94417-35.07129]; minaret [il-minaret-31.94889-35.07338]; minaret [il-minaret-31.94902-35.04479] | minaret [il-minaret-31.94417-35.07129]; minaret [il-minaret-31.94889-35.07338]; minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.94417-35.07129]; minaret [il-minaret-31.94889-35.07338]; synagogue [il-synagogue-31.93887-35.04462] → minaret [il-minaret-31.94417-35.07129]; minaret [il-minaret-31.94889-35.07338]; minaret [il-minaret-31.94902-35.04479]; synagogue [il-synagogue-31.93887-35.04462] → minaret [il-minaret-31.94417-35.07129]; minaret [il-minaret-31.94889-35.07338]; minaret [il-minaret-31.94902-35.04479] |
| אל-מידיה (il-31.9357-35.0042) | flat | minaret [il-minaret-31.93617-35.00518]; minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.93358-35.02602] → minaret [il-minaret-31.93617-35.00518] → minaret [il-minaret-31.93617-35.00518] → minaret [il-minaret-31.93617-35.00518] | minaret [il-minaret-31.93617-35.00518]; minaret [il-minaret-31.95297-34.89942]; synagogue [il-synagogue-31.93358-35.02602] → minaret [il-minaret-31.93617-35.00518] → minaret [il-minaret-31.93617-35.00518] → minaret [il-minaret-31.93617-35.00518] |
| שדה אפרים (il-31.9398-35.0919) | flat | minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 | minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 |
| נעלין (il-31.9456-35.0222) | flat | minaret [il-minaret-31.94779-35.02147] → minaret [il-minaret-31.94779-35.02147]; synagogue [il-synagogue-31.94115-35.04169] → minaret [il-minaret-31.94779-35.02147]; minaret [il-minaret-31.94902-35.04479]; synagogue [il-synagogue-31.94115-35.04169] → minaret [il-minaret-31.94779-35.02147]; synagogue [il-synagogue-31.94115-35.04169] | minaret [il-minaret-31.94779-35.02147] → minaret [il-minaret-31.94779-35.02147]; synagogue [il-synagogue-31.94115-35.04169] → minaret [il-minaret-31.94779-35.02147]; minaret [il-minaret-31.94902-35.04479]; synagogue [il-synagogue-31.94115-35.04169] → minaret [il-minaret-31.94779-35.02147]; synagogue [il-synagogue-31.94115-35.04169] |
| ראס כרכר (il-31.9423-35.1043) | flat | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| אל-ג'ניה (il-31.9390-35.1204) | flat | minaret [il-minaret-31.90408-35.20741]; minaret [il-minaret-31.93846-35.12091]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.93846-35.12091] → minaret [il-minaret-31.93846-35.12091] → minaret [il-minaret-31.93846-35.12091] | minaret [il-minaret-31.90408-35.20741]; minaret [il-minaret-31.93846-35.12091]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.93846-35.12091] → minaret [il-minaret-31.93846-35.12091] → minaret [il-minaret-31.93846-35.12091] |
| ניל"י (il-31.9640-35.0472) | flat | minaret [il-minaret-31.97218-35.05006] → minaret [il-minaret-31.97218-35.05006] → minaret [il-minaret-31.97218-35.05006] → minaret [il-minaret-31.97218-35.05006] | minaret [il-minaret-31.97218-35.05006] → minaret [il-minaret-31.97218-35.05006] → minaret [il-minaret-31.97218-35.05006] → minaret [il-minaret-31.97218-35.05006] |
| אל-איתחאד (il-31.9689-35.1034) | flat | minaret [il-minaret-31.96654-35.10377]; minaret [il-minaret-31.97176-35.09365]; minaret [il-minaret-31.97449-35.11638] → minaret [il-minaret-31.96654-35.10377]; minaret [il-minaret-31.97176-35.09365]; minaret [il-minaret-31.97449-35.11638] → minaret [il-minaret-31.96654-35.10377]; minaret [il-minaret-31.97176-35.09365]; minaret [il-minaret-31.97449-35.11638] → minaret [il-minaret-31.96654-35.10377]; minaret [il-minaret-31.97176-35.09365]; minaret [il-minaret-31.97449-35.11638] | minaret [il-minaret-31.96654-35.10377]; minaret [il-minaret-31.97176-35.09365]; minaret [il-minaret-31.97449-35.11638] → minaret [il-minaret-31.96654-35.10377]; minaret [il-minaret-31.97176-35.09365]; minaret [il-minaret-31.97449-35.11638] → minaret [il-minaret-31.96654-35.10377]; minaret [il-minaret-31.97176-35.09365]; minaret [il-minaret-31.97449-35.11638] → minaret [il-minaret-31.96654-35.10377]; minaret [il-minaret-31.97176-35.09365]; minaret [il-minaret-31.97449-35.11638] |
| שוקבא (il-31.9865-35.0391) | flat | minaret [il-minaret-31.98659-35.03902] → minaret [il-minaret-31.98659-35.03902] → minaret [il-minaret-31.98659-35.03902]; minaret [il-minaret-31.99935-35.06324] → minaret [il-minaret-31.98659-35.03902] | minaret [il-minaret-31.98659-35.03902] → minaret [il-minaret-31.98659-35.03902] → minaret [il-minaret-31.98659-35.03902]; minaret [il-minaret-31.99935-35.06324] → minaret [il-minaret-31.98659-35.03902] |
| דיר אבו משעל (il-31.9988-35.0683) | flat | minaret [il-minaret-32.00123-35.07645] → minaret [il-minaret-32.00123-35.07645] → minaret [il-minaret-32.00123-35.07645] → minaret [il-minaret-32.00123-35.07645] | minaret [il-minaret-32.00123-35.07645] → minaret [il-minaret-32.00123-35.07645] → minaret [il-minaret-32.00123-35.07645] → minaret [il-minaret-32.00123-35.07645] |
| עין עריכ (il-31.9062-35.1429) | flat | church [il-church-31.90684-35.14303]; minaret [il-minaret-31.8836-35.17462]; minaret [il-minaret-31.89737-35.17916]; minaret [il-minaret-31.90408-35.20741] → church [il-church-31.90684-35.14303] → church [il-church-31.90684-35.14303] → church [il-church-31.90684-35.14303] | church [il-church-31.90684-35.14303]; minaret [il-minaret-31.8836-35.17462]; minaret [il-minaret-31.89737-35.17916]; minaret [il-minaret-31.90408-35.20741] → church [il-church-31.90684-35.14303] → church [il-church-31.90684-35.14303] → church [il-church-31.90684-35.14303] |
| דולב (il-31.9262-35.1351) | flat | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| חרשה (il-31.9447-35.1489) | flat | church [il-church-31.90684-35.14303]; minaret [il-minaret-31.90456-35.16948]; minaret [il-minaret-31.9525-35.14784] → minaret [il-minaret-31.9525-35.14784] → minaret [il-minaret-31.9525-35.14784] → minaret [il-minaret-31.9525-35.14784] | church [il-church-31.90684-35.14303]; minaret [il-minaret-31.90456-35.16948]; minaret [il-minaret-31.9525-35.14784] → minaret [il-minaret-31.9525-35.14784] → minaret [il-minaret-31.9525-35.14784] → minaret [il-minaret-31.9525-35.14784] |
| טלמון (il-31.9394-35.1323) | flat | synagogue [il-synagogue-31.93927-35.13187]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.93823-35.16806]; synagogue [il-synagogue-31.93927-35.13187] → minaret [il-minaret-31.93823-35.16806]; synagogue [il-synagogue-31.93927-35.13187] → minaret [il-minaret-31.93823-35.16806]; synagogue [il-synagogue-31.93927-35.13187] | synagogue [il-synagogue-31.93927-35.13187]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.93823-35.16806]; synagogue [il-synagogue-31.93927-35.13187] → minaret [il-minaret-31.93823-35.16806]; synagogue [il-synagogue-31.93927-35.13187] → minaret [il-minaret-31.93823-35.16806]; synagogue [il-synagogue-31.93927-35.13187] |
| אבו קש (il-31.9513-35.1840) | flat | minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.94576-35.21398]; minaret [il-minaret-31.94973-35.18514]; minaret [il-minaret-31.95898-35.18028] → minaret [il-minaret-31.94973-35.18514]; minaret [il-minaret-31.95898-35.18028] → minaret [il-minaret-31.94973-35.18514]; minaret [il-minaret-31.95898-35.18028] → minaret [il-minaret-31.94973-35.18514]; minaret [il-minaret-31.95898-35.18028] | minaret [il-minaret-31.92492-35.21282]; minaret [il-minaret-31.94576-35.21398]; minaret [il-minaret-31.94973-35.18514]; minaret [il-minaret-31.95898-35.18028] → minaret [il-minaret-31.94973-35.18514]; minaret [il-minaret-31.95898-35.18028] → minaret [il-minaret-31.94973-35.18514]; minaret [il-minaret-31.95898-35.18028] → minaret [il-minaret-31.94973-35.18514]; minaret [il-minaret-31.95898-35.18028] |
| ביר זית (il-31.9703-35.1953) | flat | minaret [il-minaret-31.93823-35.16806]; minaret [il-minaret-31.97439-35.18768] → minaret [il-minaret-31.97439-35.18768] → minaret [il-minaret-31.97439-35.18768] → minaret [il-minaret-31.97439-35.18768] | minaret [il-minaret-31.93823-35.16806]; minaret [il-minaret-31.97439-35.18768] → minaret [il-minaret-31.97439-35.18768] → minaret [il-minaret-31.97439-35.18768] → minaret [il-minaret-31.97439-35.18768] |
| ג'יפנא (il-31.9624-35.2163) | flat | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.9611-35.21058] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.9611-35.21058] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.9611-35.21058] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.9611-35.21058] | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.9611-35.21058] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.9611-35.21058] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.9611-35.21058] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.9611-35.21058] |
| אל-מזרעה אל-קבליה (il-31.9540-35.1611) | flat | minaret [il-minaret-31.95459-35.16137] → minaret [il-minaret-31.95459-35.16137] → minaret [il-minaret-31.95459-35.16137] → minaret [il-minaret-31.95459-35.16137] | minaret [il-minaret-31.95459-35.16137] → minaret [il-minaret-31.95459-35.16137] → minaret [il-minaret-31.95459-35.16137] → minaret [il-minaret-31.95459-35.16137] |
| א-זייתונה (il-31.9601-35.1695) | flat | minaret [il-minaret-31.94576-35.21398]; minaret [il-minaret-31.96309-35.16971] → minaret [il-minaret-31.96309-35.16971] → minaret [il-minaret-31.96309-35.16971] → minaret [il-minaret-31.96309-35.16971] | minaret [il-minaret-31.94576-35.21398]; minaret [il-minaret-31.96309-35.16971] → minaret [il-minaret-31.96309-35.16971] → minaret [il-minaret-31.96309-35.16971] → minaret [il-minaret-31.96309-35.16971] |
| אבו שחידם (il-31.9656-35.1708) | flat | minaret [il-minaret-31.96413-35.17324]; minaret [il-minaret-31.96731-35.17075] → minaret [il-minaret-31.95459-35.16137]; minaret [il-minaret-31.96413-35.17324]; minaret [il-minaret-31.96731-35.17075] → minaret [il-minaret-31.95459-35.16137]; minaret [il-minaret-31.96413-35.17324]; minaret [il-minaret-31.96731-35.17075]; minaret [il-minaret-31.97439-35.18768] → minaret [il-minaret-31.96413-35.17324]; minaret [il-minaret-31.96731-35.17075] | minaret [il-minaret-31.93823-35.16806]; minaret [il-minaret-31.96413-35.17324]; minaret [il-minaret-31.96731-35.17075] → minaret [il-minaret-31.95459-35.16137]; minaret [il-minaret-31.96413-35.17324]; minaret [il-minaret-31.96731-35.17075] → minaret [il-minaret-31.95459-35.16137]; minaret [il-minaret-31.96413-35.17324]; minaret [il-minaret-31.96731-35.17075]; minaret [il-minaret-31.97439-35.18768] → minaret [il-minaret-31.96413-35.17324]; minaret [il-minaret-31.96731-35.17075] |
| נריה ב' (il-31.9506-35.1354) | flat | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| נריה (il-31.9543-35.1258) | flat | synagogue [il-synagogue-31.94255-35.22212]; synagogue [il-synagogue-31.95392-35.12558] → synagogue [il-synagogue-31.95392-35.12558] → synagogue [il-synagogue-31.95392-35.12558] → synagogue [il-synagogue-31.95392-35.12558] | synagogue [il-synagogue-31.94255-35.22212]; synagogue [il-synagogue-31.95392-35.12558] → synagogue [il-synagogue-31.95392-35.12558] → synagogue [il-synagogue-31.95392-35.12558] → synagogue [il-synagogue-31.95392-35.12558] |
| זית רענן (il-31.9562-35.1175) | flat | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| כרם רעים (il-31.9587-35.1381) | flat | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| נחליאל (il-31.9737-35.1402) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כובאר (il-31.9887-35.1577) | flat | minaret [il-minaret-31.97819-35.16647]; minaret [il-minaret-31.98698-35.1544]; minaret [il-minaret-31.99049-35.15867] → minaret [il-minaret-31.97819-35.16647]; minaret [il-minaret-31.98698-35.1544]; minaret [il-minaret-31.99049-35.15867] → minaret [il-minaret-31.97819-35.16647]; minaret [il-minaret-31.98698-35.1544]; minaret [il-minaret-31.99049-35.15867] → minaret [il-minaret-31.97819-35.16647]; minaret [il-minaret-31.98698-35.1544]; minaret [il-minaret-31.99049-35.15867] | minaret [il-minaret-31.97819-35.16647]; minaret [il-minaret-31.98698-35.1544]; minaret [il-minaret-31.99049-35.15867] → minaret [il-minaret-31.97819-35.16647]; minaret [il-minaret-31.98698-35.1544]; minaret [il-minaret-31.99049-35.15867] → minaret [il-minaret-31.97819-35.16647]; minaret [il-minaret-31.98698-35.1544]; minaret [il-minaret-31.99049-35.15867] → minaret [il-minaret-31.97819-35.16647]; minaret [il-minaret-31.98698-35.1544]; minaret [il-minaret-31.99049-35.15867] |
| עטארה (il-32.0030-35.2071) | flat | minaret [il-minaret-31.99587-35.19875]; minaret [il-minaret-32.00466-35.20806] → minaret [il-minaret-31.99587-35.19875]; minaret [il-minaret-32.00466-35.20806] → minaret [il-minaret-31.99587-35.19875]; minaret [il-minaret-32.00466-35.20806] → minaret [il-minaret-31.99587-35.19875]; minaret [il-minaret-32.00466-35.20806] | minaret [il-minaret-31.99587-35.19875]; minaret [il-minaret-32.00466-35.20806] → minaret [il-minaret-31.99587-35.19875]; minaret [il-minaret-32.00466-35.20806] → minaret [il-minaret-31.99587-35.19875]; minaret [il-minaret-32.00466-35.20806] → minaret [il-minaret-31.99587-35.19875]; minaret [il-minaret-32.00466-35.20806] |
| עטרת (il-32.0005-35.1766) | flat | synagogue [il-synagogue-32.00106-35.17581] → synagogue [il-synagogue-32.00106-35.17581] → synagogue [il-synagogue-32.00106-35.17581] → synagogue [il-synagogue-32.00106-35.17581] | synagogue [il-synagogue-32.00106-35.17581] → synagogue [il-synagogue-32.00106-35.17581] → synagogue [il-synagogue-32.00106-35.17581] → synagogue [il-synagogue-32.00106-35.17581] |
| דיר דיבוואן (il-31.9113-35.2689) | flat | minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.91032-35.27113] → minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.91032-35.27113] → minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.91032-35.27113] → minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.91032-35.27113] | minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.91032-35.27113] → minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.91032-35.27113] → minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.91032-35.27113] → minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.91032-35.27113] |
| עוז ציון (il-31.9082-35.2505) | flat | minaret [il-minaret-31.89272-35.20815] → 0 → 0 → 0 | minaret [il-minaret-31.89272-35.20815] → 0 → 0 → 0 |
| גבעת אסף (il-31.9113-35.2479) | flat | minaret [il-minaret-31.89272-35.20815] → 0 → 0 → 0 | minaret [il-minaret-31.89272-35.20815] → 0 → 0 → 0 |
| ביתין (il-31.9259-35.2398) | flat | minaret [il-minaret-31.89272-35.20815]; minaret [il-minaret-31.9089-35.20165]; minaret [il-minaret-31.91939-35.25146]; minaret [il-minaret-31.92494-35.23921]; synagogue [il-synagogue-31.93391-35.22948] → minaret [il-minaret-31.91939-35.25146]; minaret [il-minaret-31.92494-35.23921]; synagogue [il-synagogue-31.93391-35.22948] → minaret [il-minaret-31.91939-35.25146]; minaret [il-minaret-31.92494-35.23921]; synagogue [il-synagogue-31.93391-35.22948] → minaret [il-minaret-31.91939-35.25146]; minaret [il-minaret-31.92494-35.23921]; synagogue [il-synagogue-31.93391-35.22948] | minaret [il-minaret-31.89272-35.20815]; minaret [il-minaret-31.9089-35.20165]; minaret [il-minaret-31.91939-35.25146]; minaret [il-minaret-31.92494-35.23921]; synagogue [il-synagogue-31.93391-35.22948] → minaret [il-minaret-31.91939-35.25146]; minaret [il-minaret-31.92494-35.23921]; synagogue [il-synagogue-31.93391-35.22948] → minaret [il-minaret-31.91939-35.25146]; minaret [il-minaret-31.92494-35.23921]; synagogue [il-synagogue-31.93391-35.22948] → minaret [il-minaret-31.91939-35.25146]; minaret [il-minaret-31.92494-35.23921]; synagogue [il-synagogue-31.93391-35.22948] |
| רמון (il-31.9312-35.2995) | flat | minaret [il-minaret-31.92874-35.29986]; minaret [il-minaret-31.93574-35.29716]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.92874-35.29986]; minaret [il-minaret-31.93574-35.29716] → minaret [il-minaret-31.92874-35.29986]; minaret [il-minaret-31.93574-35.29716] → minaret [il-minaret-31.92874-35.29986]; minaret [il-minaret-31.93574-35.29716] | minaret [il-minaret-31.92874-35.29986]; minaret [il-minaret-31.93574-35.29716]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-31.92874-35.29986]; minaret [il-minaret-31.93574-35.29716] → minaret [il-minaret-31.92874-35.29986]; minaret [il-minaret-31.93574-35.29716] → minaret [il-minaret-31.92874-35.29986]; minaret [il-minaret-31.93574-35.29716] |
| טייבה (il-31.9533-35.3006) | flat | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| דיר ג'ריר (il-31.9651-35.2939) | flat | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.96461-35.29574] → minaret [il-minaret-31.96461-35.29574] → minaret [il-minaret-31.96461-35.29574] → minaret [il-minaret-31.96461-35.29574] | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.96461-35.29574] → minaret [il-minaret-31.96461-35.29574] → minaret [il-minaret-31.96461-35.29574] → minaret [il-minaret-31.96461-35.29574] |
| חוות חסד לאברהם (il-31.9738-35.2891) | flat | minaret [il-minaret-31.95314-35.25185] → 0 → 0 → 0 | minaret [il-minaret-31.95314-35.25185] → 0 → 0 → 0 |
| אור אהוביה (il-31.9358-35.2715) | flat | minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 | minaret [il-minaret-31.90138-35.25567]; minaret [il-minaret-31.90408-35.20741] → 0 → 0 → 0 |
| עין יברוד (il-31.9511-35.2508) | flat | minaret [il-minaret-31.95138-35.2123]; minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.95648-35.22634] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435] | minaret [il-minaret-31.95138-35.2123]; minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.95648-35.22634] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435] |
| עפרה (il-31.9535-35.2605) | flat | minaret [il-minaret-31.95314-35.25185] → 0 → minaret [il-minaret-31.95541-35.24435] → 0 | minaret [il-minaret-31.95314-35.25185] → 0 → minaret [il-minaret-31.95541-35.24435] → 0 |
| דורא אל-קרע (il-31.9591-35.2293) | flat | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95648-35.22634] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.95648-35.22634]; synagogue [il-synagogue-31.95383-35.26019] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.95648-35.22634]; synagogue [il-synagogue-31.95383-35.26019] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.95648-35.22634] | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95648-35.22634] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.95648-35.22634]; synagogue [il-synagogue-31.95383-35.26019] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.95648-35.22634]; synagogue [il-synagogue-31.95383-35.26019] → minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.95648-35.22634] |
| עין סיניא (il-31.9714-35.2278) | flat | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; synagogue [il-synagogue-31.94728-35.22321]; synagogue [il-synagogue-31.95383-35.26019] → 0 → 0 → 0 | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; synagogue [il-synagogue-31.94728-35.22321]; synagogue [il-synagogue-31.95383-35.26019] → 0 → 0 → 0 |
| סילואד (il-31.9751-35.2625) | flat | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.97807-35.25959] → minaret [il-minaret-31.97807-35.25959] → minaret [il-minaret-31.97807-35.25959] → minaret [il-minaret-31.97807-35.25959] | minaret [il-minaret-31.95314-35.25185]; minaret [il-minaret-31.95541-35.24435]; minaret [il-minaret-31.97807-35.25959] → minaret [il-minaret-31.97807-35.25959] → minaret [il-minaret-31.97807-35.25959] → minaret [il-minaret-31.97807-35.25959] |
| יברוד (il-31.9762-35.2441) | flat | minaret [il-minaret-31.97677-35.24265] → minaret [il-minaret-31.97677-35.24265] → minaret [il-minaret-31.97677-35.24265] → minaret [il-minaret-31.97677-35.24265] | minaret [il-minaret-31.97677-35.24265] → minaret [il-minaret-31.97677-35.24265] → minaret [il-minaret-31.97677-35.24265] → minaret [il-minaret-31.97677-35.24265] |
| כפר מאלכ (il-31.9894-35.3091) | flat | minaret [il-minaret-31.98613-35.30453] → minaret [il-minaret-31.98613-35.30453] → minaret [il-minaret-31.98613-35.30453] → minaret [il-minaret-31.98613-35.30453] | minaret [il-minaret-31.98613-35.30453] → minaret [il-minaret-31.98613-35.30453] → minaret [il-minaret-31.98613-35.30453] → minaret [il-minaret-31.98613-35.30453] |
| אל-מזרעה א-שרקיה (il-32.0022-35.2810) | flat | minaret [il-minaret-31.99865-35.28401]; minaret [il-minaret-32.003-35.2729] → minaret [il-minaret-31.99865-35.28401]; minaret [il-minaret-32.003-35.2729] → minaret [il-minaret-31.99865-35.28401]; minaret [il-minaret-32.003-35.2729] → minaret [il-minaret-31.99865-35.28401]; minaret [il-minaret-32.003-35.2729] | minaret [il-minaret-31.99865-35.28401]; minaret [il-minaret-32.003-35.2729] → minaret [il-minaret-31.99865-35.28401]; minaret [il-minaret-32.003-35.2729] → minaret [il-minaret-31.99865-35.28401]; minaret [il-minaret-32.003-35.2729] → minaret [il-minaret-31.99865-35.28401]; minaret [il-minaret-32.003-35.2729] |
| רימונים (il-31.9345-35.3401) | flat | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| קול דודי (il-31.9462-35.3433) | flat | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| מעלה שלמה (il-31.9494-35.3440) | flat | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| אעירה שחר (il-31.9508-35.3691) | flat | synagogue [il-synagogue-31.94255-35.22212]; synagogue [il-synagogue-31.94994-35.36943] → synagogue [il-synagogue-31.94994-35.36943] → synagogue [il-synagogue-31.94994-35.36943] → synagogue [il-synagogue-31.94994-35.36943] | synagogue [il-synagogue-31.94255-35.22212]; synagogue [il-synagogue-31.94994-35.36943] → synagogue [il-synagogue-31.94994-35.36943] → synagogue [il-synagogue-31.94994-35.36943] → synagogue [il-synagogue-31.94994-35.36943] |
| כוכב השחר (il-31.9603-35.3495) | flat | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 | synagogue [il-synagogue-31.94255-35.22212] → 0 → 0 → 0 |
| מצפה כרמים (il-31.9575-35.3569) | flat | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.94255-35.22212] → 0 → synagogue [il-synagogue-31.95849-35.35197] → synagogue [il-synagogue-31.95849-35.35197] | minaret [il-minaret-31.90408-35.20741]; synagogue [il-synagogue-31.94255-35.22212] → 0 → synagogue [il-synagogue-31.95849-35.35197] → synagogue [il-synagogue-31.95849-35.35197] |
| חוות שלישה (il-31.9996-35.3349) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מבואות יריחו (il-31.9080-35.4171) | flat | synagogue [il-synagogue-31.90796-35.4174] → synagogue [il-synagogue-31.90796-35.4174] → synagogue [il-synagogue-31.90796-35.4174] → synagogue [il-synagogue-31.90796-35.4174] | synagogue [il-synagogue-31.90796-35.4174] → synagogue [il-synagogue-31.90796-35.4174] → synagogue [il-synagogue-31.90796-35.4174] → synagogue [il-synagogue-31.90796-35.4174] |
| נעמה (il-31.9068-35.4672) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-עווג'א (il-31.9490-35.4655) | flat | minaret [il-minaret-31.94293-35.46526] → minaret [il-minaret-31.94293-35.46526] → minaret [il-minaret-31.94293-35.46526] → minaret [il-minaret-31.94293-35.46526] | minaret [il-minaret-31.94293-35.46526] → minaret [il-minaret-31.94293-35.46526] → minaret [il-minaret-31.94293-35.46526] → minaret [il-minaret-31.94293-35.46526] |
| ייט"ב (il-31.9475-35.4241) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נערן (il-31.9669-35.4549) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נתיב הגדוד (il-31.9883-35.4451) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גלגל (il-31.9997-35.4452) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מגשימים (il-32.0470-34.8993) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בני עטרות (il-32.0236-34.9119) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בארות יצחק (il-32.0394-34.9109) | flat | 0 → 0 → synagogue [il-synagogue-32.03815-34.895] → 0 | 0 → 0 → synagogue [il-synagogue-32.03815-34.895] → 0 |
| נופך (il-32.0436-34.9207) | flat | 0 → synagogue [il-synagogue-32.03815-34.895] → synagogue [il-synagogue-32.03815-34.895] → 0 | 0 → synagogue [il-synagogue-32.03815-34.895] → synagogue [il-synagogue-32.03815-34.895] → synagogue [il-synagogue-32.03815-34.895] |
| רינתיה (il-32.0433-34.9317) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מזור (il-32.0523-34.9234) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אלעד (il-32.0501-34.9522) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נחשונים (il-32.0615-34.9492) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ראש העין (il-32.0953-34.9533) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר קאסם (il-32.1152-34.9753) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חגור (il-32.1376-34.9482) | flat | minaret [il-minaret-32.1144-34.97774]; minaret [il-minaret-32.11476-34.97348] → 0 → 0 → 0 | minaret [il-minaret-32.1144-34.97774]; minaret [il-minaret-32.11476-34.97348] → 0 → 0 → 0 |
| כפר ברא (il-32.1311-34.9703) | flat | minaret [il-minaret-32.11517-34.98335]; minaret [il-minaret-32.1309-34.97182] → minaret [il-minaret-32.1309-34.97182] → minaret [il-minaret-32.1309-34.97182]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.1309-34.97182] | minaret [il-minaret-32.11517-34.98335]; minaret [il-minaret-32.1309-34.97182] → minaret [il-minaret-32.1309-34.97182] → minaret [il-minaret-32.1309-34.97182]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.1309-34.97182] |
| חורשים (il-32.1372-34.9707) | flat | minaret [il-minaret-32.11517-34.98335]; minaret [il-minaret-32.14161-34.97123] → minaret [il-minaret-32.14161-34.97123] → minaret [il-minaret-32.14161-34.97123]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14161-34.97123] | minaret [il-minaret-32.11517-34.98335]; minaret [il-minaret-32.14161-34.97123] → minaret [il-minaret-32.14161-34.97123] → minaret [il-minaret-32.14161-34.97123]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14161-34.97123] |
| ג'לג'וליה (il-32.1523-34.9537) | flat | minaret [il-minaret-32.15067-34.95301]; minaret [il-minaret-32.18783-34.80582] → minaret [il-minaret-32.15067-34.95301] → minaret [il-minaret-32.15067-34.95301] → minaret [il-minaret-32.15067-34.95301] | minaret [il-minaret-32.15067-34.95301]; minaret [il-minaret-32.18783-34.80582] → minaret [il-minaret-32.15067-34.95301] → minaret [il-minaret-32.15067-34.95301] → minaret [il-minaret-32.15067-34.95301] |
| אורנית (il-32.1309-34.9920) | flat | minaret [il-minaret-32.11099-34.97177]; synagogue [il-synagogue-32.13011-34.99527] → synagogue [il-synagogue-32.13011-34.99527] → synagogue [il-synagogue-32.13011-34.99527] → synagogue [il-synagogue-32.13011-34.99527] | minaret [il-minaret-32.11099-34.97177]; synagogue [il-synagogue-32.13011-34.99527] → synagogue [il-synagogue-32.13011-34.99527] → synagogue [il-synagogue-32.13011-34.99527] → synagogue [il-synagogue-32.13011-34.99527] |
| שדי חמד (il-32.1598-34.9436) | flat | minaret [il-minaret-32.18783-34.80582] → minaret [il-minaret-32.15465-34.9497]; minaret [il-minaret-32.15574-34.95406] → minaret [il-minaret-32.15465-34.9497]; minaret [il-minaret-32.15574-34.95406] → 0 | minaret [il-minaret-32.18783-34.80582] → minaret [il-minaret-32.15465-34.9497]; minaret [il-minaret-32.15574-34.95406] → minaret [il-minaret-32.15465-34.9497]; minaret [il-minaret-32.15574-34.95406] → minaret [il-minaret-32.15574-34.95406] |
| עינת (il-32.0828-34.9394) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת השלושה (il-32.0981-34.9211) | flat | 0 → synagogue [il-synagogue-32.0892-34.90714] → synagogue [il-synagogue-32.0892-34.90714] → synagogue [il-synagogue-32.0892-34.90714] | 0 → synagogue [il-synagogue-32.0892-34.90714] → synagogue [il-synagogue-32.0892-34.90714]; synagogue [il-synagogue-32.09964-34.94144] → synagogue [il-synagogue-32.0892-34.90714]; synagogue [il-synagogue-32.09964-34.94144] |
| עבוד (il-32.0155-35.0691) | flat | church [il-church-32.01727-35.06875] → church [il-church-32.01727-35.06875] → church [il-church-32.01727-35.06875] → church [il-church-32.01727-35.06875] | church [il-church-32.01727-35.06875] → church [il-church-32.01727-35.06875] → church [il-church-32.01727-35.06875] → church [il-church-32.01727-35.06875] |
| רנתיס (il-32.0288-35.0191) | flat | minaret [il-minaret-32.02666-35.01793] → minaret [il-minaret-32.02666-35.01793] → minaret [il-minaret-32.02666-35.01793] → minaret [il-minaret-32.02666-35.01793] | minaret [il-minaret-32.02666-35.01793] → minaret [il-minaret-32.02666-35.01793] → minaret [il-minaret-32.02666-35.01793] → minaret [il-minaret-32.02666-35.01793] |
| בני זייד אל-ע'רביה (il-32.0319-35.1039) | flat | minaret [il-minaret-32.03073-35.10533] → minaret [il-minaret-32.03073-35.10533] → minaret [il-minaret-32.03073-35.10533] → minaret [il-minaret-32.03073-35.10533] | minaret [il-minaret-32.03073-35.10533] → minaret [il-minaret-32.03073-35.10533] → minaret [il-minaret-32.03073-35.10533] → minaret [il-minaret-32.03073-35.10533] |
| בית אריה (il-32.0341-35.0502) | flat | synagogue [il-synagogue-32.03843-35.05089] → synagogue [il-synagogue-32.03843-35.05089] → synagogue [il-synagogue-32.03843-35.05089] → synagogue [il-synagogue-32.03843-35.05089] | synagogue [il-synagogue-32.03843-35.05089] → synagogue [il-synagogue-32.03843-35.05089] → synagogue [il-synagogue-32.03843-35.05089] → synagogue [il-synagogue-32.03843-35.05089] |
| א-לובאן (il-32.0351-35.0397) | flat | minaret [il-minaret-32.03458-35.03896] → minaret [il-minaret-32.03458-35.03896] → minaret [il-minaret-32.03458-35.03896] → minaret [il-minaret-32.03458-35.03896] | minaret [il-minaret-32.03458-35.03896] → minaret [il-minaret-32.03458-35.03896] → minaret [il-minaret-32.03458-35.03896] → minaret [il-minaret-32.03458-35.03896] |
| דיר בלוט (il-32.0648-35.0255) | flat | minaret [il-minaret-32.06349-35.02739] → minaret [il-minaret-32.06349-35.02739] → minaret [il-minaret-32.06349-35.02739] → minaret [il-minaret-32.06349-35.02739] | minaret [il-minaret-32.06349-35.02739] → minaret [il-minaret-32.06349-35.02739] → minaret [il-minaret-32.06349-35.02739] → minaret [il-minaret-32.06349-35.02739] |
| פדואל (il-32.0618-35.0532) | flat | synagogue [il-synagogue-32.0629-35.05359] → synagogue [il-synagogue-32.0629-35.05359] → synagogue [il-synagogue-32.0629-35.05359] → synagogue [il-synagogue-32.0629-35.05359] | synagogue [il-synagogue-32.0629-35.05359] → synagogue [il-synagogue-32.0629-35.05359] → synagogue [il-synagogue-32.0629-35.05359] → synagogue [il-synagogue-32.0629-35.05359] |
| לשם (il-32.0697-35.0508) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עלי זהב (il-32.0711-35.0633) | flat | 0 → 0 → 0 → 0 | 0 → 0 → synagogue [il-synagogue-32.06977-35.05449] → synagogue [il-synagogue-32.06977-35.05449] |
| ראפאת (il-32.0775-35.0443) | flat | minaret [il-minaret-32.07857-35.04268] → minaret [il-minaret-32.07857-35.04268] → minaret [il-minaret-32.07857-35.04268]; synagogue [il-synagogue-32.06977-35.05449] → minaret [il-minaret-32.07857-35.04268] | minaret [il-minaret-32.07857-35.04268] → minaret [il-minaret-32.07857-35.04268] → minaret [il-minaret-32.07857-35.04268]; synagogue [il-synagogue-32.06977-35.05449] → minaret [il-minaret-32.07857-35.04268] |
| ברוכין (il-32.0821-35.0907) | flat | synagogue [il-synagogue-32.08035-35.08851] → synagogue [il-synagogue-32.08035-35.08851] → synagogue [il-synagogue-32.08035-35.08851] → synagogue [il-synagogue-32.08035-35.08851] | synagogue [il-synagogue-32.08035-35.08851] → synagogue [il-synagogue-32.08035-35.08851] → synagogue [il-synagogue-32.08035-35.08851] → synagogue [il-synagogue-32.08035-35.08851] |
| א-זאוויה (il-32.0950-35.0400) | flat | minaret [il-minaret-32.09622-35.03963] → minaret [il-minaret-32.09622-35.03963] → minaret [il-minaret-32.09622-35.03963] → minaret [il-minaret-32.09622-35.03963] | minaret [il-minaret-32.09622-35.03963] → minaret [il-minaret-32.09622-35.03963] → minaret [il-minaret-32.09622-35.03963] → minaret [il-minaret-32.09622-35.03963] |
| דיר ניד'אם (il-32.0030-35.1140) | flat | minaret [il-minaret-32.00176-35.11331]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-32.00176-35.11331] → minaret [il-minaret-32.00176-35.11331]; synagogue [il-synagogue-32.00453-35.12246] → minaret [il-minaret-32.00176-35.11331] | minaret [il-minaret-32.00176-35.11331]; synagogue [il-synagogue-31.94255-35.22212] → minaret [il-minaret-32.00176-35.11331] → minaret [il-minaret-32.00176-35.11331]; synagogue [il-synagogue-32.00453-35.12246] → minaret [il-minaret-32.00176-35.11331] |
| נווה צוף (il-32.0063-35.1269) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נבי סלאח (il-32.0153-35.1255) | flat | minaret [il-minaret-32.01747-35.12441]; minaret [il-minaret-32.02229-35.16273] → minaret [il-minaret-32.01747-35.12441] → minaret [il-minaret-32.01747-35.12441] → minaret [il-minaret-32.01747-35.12441] | minaret [il-minaret-32.01747-35.12441]; minaret [il-minaret-32.02229-35.16273] → minaret [il-minaret-32.01747-35.12441] → minaret [il-minaret-32.01747-35.12441] → minaret [il-minaret-32.01747-35.12441] |
| רוואבי (il-32.0119-35.1902) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אום צפא (il-32.0084-35.1659) | flat | minaret [il-minaret-32.0089-35.16564] → minaret [il-minaret-32.0089-35.16564] → minaret [il-minaret-32.0089-35.16564] → minaret [il-minaret-32.0089-35.16564] | minaret [il-minaret-32.0089-35.16564] → minaret [il-minaret-32.0089-35.16564] → minaret [il-minaret-32.0089-35.16564] → minaret [il-minaret-32.0089-35.16564] |
| עג'ול (il-32.0225-35.1796) | flat | minaret [il-minaret-32.02244-35.18055] → minaret [il-minaret-32.02244-35.18055] → minaret [il-minaret-32.02244-35.18055]; minaret [il-minaret-32.0344-35.1479] → minaret [il-minaret-32.02244-35.18055]; minaret [il-minaret-32.0344-35.1479] | minaret [il-minaret-32.02244-35.18055] → minaret [il-minaret-32.02244-35.18055] → minaret [il-minaret-32.02244-35.18055]; minaret [il-minaret-32.0344-35.1479] → minaret [il-minaret-32.02244-35.18055]; minaret [il-minaret-32.0344-35.1479] |
| דיר א-סודאן (il-32.0314-35.1491) | flat | minaret [il-minaret-32.0089-35.16564]; minaret [il-minaret-32.02229-35.16273]; minaret [il-minaret-32.0344-35.1479] → minaret [il-minaret-32.02229-35.16273]; minaret [il-minaret-32.0344-35.1479] → minaret [il-minaret-32.02229-35.16273]; minaret [il-minaret-32.0344-35.1479] → minaret [il-minaret-32.02229-35.16273]; minaret [il-minaret-32.0344-35.1479] | minaret [il-minaret-32.0089-35.16564]; minaret [il-minaret-32.02229-35.16273]; minaret [il-minaret-32.0344-35.1479] → minaret [il-minaret-32.02229-35.16273]; minaret [il-minaret-32.0344-35.1479] → minaret [il-minaret-32.02229-35.16273]; minaret [il-minaret-32.0344-35.1479] → minaret [il-minaret-32.02229-35.16273]; minaret [il-minaret-32.0344-35.1479] |
| עבווין (il-32.0326-35.2023) | flat | minaret [il-minaret-32.03056-35.20272]; minaret [il-minaret-32.0325-35.19512] → minaret [il-minaret-32.03056-35.20272]; minaret [il-minaret-32.0325-35.19512] → minaret [il-minaret-32.03056-35.20272]; minaret [il-minaret-32.0325-35.19512] → minaret [il-minaret-32.03056-35.20272]; minaret [il-minaret-32.0325-35.19512] | minaret [il-minaret-32.03056-35.20272]; minaret [il-minaret-32.0325-35.19512] → minaret [il-minaret-32.03056-35.20272]; minaret [il-minaret-32.0325-35.19512] → minaret [il-minaret-32.03056-35.20272]; minaret [il-minaret-32.0325-35.19512] → minaret [il-minaret-32.03056-35.20272]; minaret [il-minaret-32.0325-35.19512] |
| קראוות בני זייד (il-32.0535-35.1283) | flat | minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.05688-35.12721] → minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.05688-35.12721] → minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.05688-35.12721] → minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.05688-35.12721] | minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.05688-35.12721] → minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.05688-35.12721] → minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.05688-35.12721] → minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.05688-35.12721] |
| כפר עין (il-32.0472-35.1201) | flat | minaret [il-minaret-32.04818-35.11986] → minaret [il-minaret-32.04818-35.11986] → minaret [il-minaret-32.04818-35.11986] → minaret [il-minaret-32.04818-35.11986] | minaret [il-minaret-32.04818-35.11986] → minaret [il-minaret-32.04818-35.11986] → minaret [il-minaret-32.04818-35.11986] → minaret [il-minaret-32.04818-35.11986] |
| פרח'ה (il-32.0689-35.1503) | flat | minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.07004-35.15129] → minaret [il-minaret-32.07004-35.15129] → minaret [il-minaret-32.07004-35.15129] → minaret [il-minaret-32.07004-35.15129] | minaret [il-minaret-32.05354-35.12832]; minaret [il-minaret-32.07004-35.15129] → minaret [il-minaret-32.07004-35.15129] → minaret [il-minaret-32.07004-35.15129] → minaret [il-minaret-32.07004-35.15129] |
| סלפית (il-32.0852-35.1815) | flat | minaret [il-minaret-32.08376-35.17736]; minaret [il-minaret-32.08413-35.18679] → minaret [il-minaret-32.08376-35.17736]; minaret [il-minaret-32.08413-35.18679] → minaret [il-minaret-32.08376-35.17736]; minaret [il-minaret-32.08413-35.18679] → minaret [il-minaret-32.08376-35.17736]; minaret [il-minaret-32.08413-35.18679] | minaret [il-minaret-32.08376-35.17736]; minaret [il-minaret-32.08413-35.18679] → minaret [il-minaret-32.08376-35.17736]; minaret [il-minaret-32.08413-35.18679] → minaret [il-minaret-32.08376-35.17736]; minaret [il-minaret-32.08413-35.18679] → minaret [il-minaret-32.08376-35.17736]; minaret [il-minaret-32.08413-35.18679] |
| ברקן (il-32.1066-35.1066) | flat | minaret [il-minaret-32.11699-35.09777] → minaret [il-minaret-32.11699-35.09777] → minaret [il-minaret-32.11699-35.09777] → minaret [il-minaret-32.11699-35.09777] | minaret [il-minaret-32.11699-35.09777] → minaret [il-minaret-32.11699-35.09777] → minaret [il-minaret-32.11699-35.09777] → minaret [il-minaret-32.11699-35.09777] |
| קריית נטפים (il-32.1165-35.1127) | flat | minaret [il-minaret-32.1311-35.13878]; synagogue [il-synagogue-32.1169-35.11369] → minaret [il-minaret-32.1311-35.13878]; synagogue [il-synagogue-32.1169-35.11369] → minaret [il-minaret-32.1311-35.13878]; synagogue [il-synagogue-32.1169-35.11369] → synagogue [il-synagogue-32.1169-35.11369] | minaret [il-minaret-32.1311-35.13878]; synagogue [il-synagogue-32.1169-35.11369] → minaret [il-minaret-32.1311-35.13878]; synagogue [il-synagogue-32.1169-35.11369] → minaret [il-minaret-32.1311-35.13878]; synagogue [il-synagogue-32.1169-35.11369] → synagogue [il-synagogue-32.1169-35.11369] |
| מעלה ישראל (il-32.1159-35.1051) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אריאל (il-32.1061-35.1851) | flat | synagogue [il-synagogue-32.1069-35.1874] → synagogue [il-synagogue-32.1069-35.1874] → synagogue [il-synagogue-32.1069-35.1874] → synagogue [il-synagogue-32.1069-35.1874] | synagogue [il-synagogue-32.1069-35.1874] → synagogue [il-synagogue-32.1069-35.1874] → synagogue [il-synagogue-32.1069-35.1874] → synagogue [il-synagogue-32.1069-35.1874] |
| מרדה (il-32.1143-35.1956) | flat | minaret [il-minaret-32.11272-35.19377]; minaret [il-minaret-32.1222-35.17114] → minaret [il-minaret-32.1038-35.22535]; minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.11272-35.19377] → minaret [il-minaret-32.1038-35.22535]; minaret [il-minaret-32.11272-35.19377]; minaret [il-minaret-32.1222-35.17114] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825]; minaret [il-minaret-32.11272-35.19377] | minaret [il-minaret-32.11272-35.19377]; minaret [il-minaret-32.1222-35.17114] → minaret [il-minaret-32.1038-35.22535]; minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.11272-35.19377] → minaret [il-minaret-32.1038-35.22535]; minaret [il-minaret-32.11272-35.19377]; minaret [il-minaret-32.1222-35.17114] → minaret [il-minaret-32.1038-35.22535]; minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.11272-35.19377] |
| ח'ירבת אבו פלאח (il-32.0167-35.2998) | flat | minaret [il-minaret-32.01666-35.30213] → minaret [il-minaret-32.01666-35.30213] → minaret [il-minaret-32.01666-35.30213] → minaret [il-minaret-32.01666-35.30213] | minaret [il-minaret-32.01666-35.30213] → minaret [il-minaret-32.01666-35.30213] → minaret [il-minaret-32.01666-35.30213] → minaret [il-minaret-32.01666-35.30213] |
| ג'לג'יליה (il-32.0280-35.2293) | flat | minaret [il-minaret-32.0314-35.22285] → minaret [il-minaret-32.0314-35.22285] → minaret [il-minaret-32.0314-35.22285] → minaret [il-minaret-32.0314-35.22285] | minaret [il-minaret-32.0314-35.22285] → minaret [il-minaret-32.0314-35.22285] → minaret [il-minaret-32.0314-35.22285] → minaret [il-minaret-32.0314-35.22285] |
| סינג'יל (il-32.0328-35.2646) | flat | minaret [il-minaret-32.03236-35.26433]; minaret [il-minaret-32.03671-35.28552] → minaret [il-minaret-32.03236-35.26433] → minaret [il-minaret-32.03236-35.26433] → minaret [il-minaret-32.03236-35.26433] | minaret [il-minaret-32.03236-35.26433]; minaret [il-minaret-32.03671-35.28552] → minaret [il-minaret-32.03236-35.26433] → minaret [il-minaret-32.03236-35.26433] → minaret [il-minaret-32.03236-35.26433] |
| תורמוסעייא (il-32.0357-35.2859) | flat | minaret [il-minaret-32.0303-35.28909]; minaret [il-minaret-32.03671-35.28552] → minaret [il-minaret-32.0303-35.28909]; minaret [il-minaret-32.03671-35.28552] → minaret [il-minaret-32.0303-35.28909]; minaret [il-minaret-32.03671-35.28552] → minaret [il-minaret-32.0303-35.28909]; minaret [il-minaret-32.03671-35.28552] | minaret [il-minaret-32.0303-35.28909]; minaret [il-minaret-32.03671-35.28552] → minaret [il-minaret-32.0303-35.28909]; minaret [il-minaret-32.03671-35.28552] → minaret [il-minaret-32.0303-35.28909]; minaret [il-minaret-32.03671-35.28552] → minaret [il-minaret-32.0303-35.28909]; minaret [il-minaret-32.03671-35.28552] |
| שילה (il-32.0552-35.2995) | flat | synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] | synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] |
| מעלה לבונה (il-32.0550-35.2403) | flat | synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] | synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] |
| גבעת הראל (il-32.0596-35.2723) | flat | minaret [il-minaret-32.03671-35.28552]; synagogue [il-synagogue-32.05925-35.27247] → synagogue [il-synagogue-32.0517-35.29645]; synagogue [il-synagogue-32.05925-35.27247] → synagogue [il-synagogue-32.0517-35.29645]; synagogue [il-synagogue-32.05925-35.27247] → synagogue [il-synagogue-32.05925-35.27247] | minaret [il-minaret-32.03671-35.28552]; synagogue [il-synagogue-32.05925-35.27247] → synagogue [il-synagogue-32.0517-35.29645]; synagogue [il-synagogue-32.05925-35.27247] → synagogue [il-synagogue-32.0517-35.29645]; synagogue [il-synagogue-32.05925-35.27247] → synagogue [il-synagogue-32.05925-35.27247] |
| عمورية (il-32.0633-35.2096) | flat | minaret [il-minaret-32.07157-35.24342] → 0 → 0 → 0 | minaret [il-minaret-32.07157-35.24342] → 0 → 0 → 0 |
| נווה שיר (il-32.0669-35.2534) | flat | 0 → synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] | 0 → synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] → synagogue [il-synagogue-32.05434-35.23921] |
| עלי (il-32.0695-35.2625) | flat | minaret [il-minaret-32.03671-35.28552] → 0 → minaret [il-minaret-32.07157-35.24342] → 0 | minaret [il-minaret-32.03671-35.28552] → 0 → minaret [il-minaret-32.07157-35.24342] → 0 |
| נאות אילן (il-32.0732-35.2668) | flat | 0 → minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.07151-35.29369] | 0 → minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.07151-35.29369] |
| נווה שהם (il-32.0776-35.2732) | flat | 0 → minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.07151-35.29369] | 0 → minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.07151-35.29369] |
| נוף הרים (il-32.0759-35.2775) | flat | 0 → minaret [il-minaret-32.07151-35.29369]; synagogue [il-synagogue-32.0517-35.29645] → minaret [il-minaret-32.07151-35.29369]; synagogue [il-synagogue-32.0517-35.29645] → minaret [il-minaret-32.07151-35.29369] | 0 → minaret [il-minaret-32.07151-35.29369]; synagogue [il-synagogue-32.0517-35.29645] → minaret [il-minaret-32.07151-35.29369]; synagogue [il-synagogue-32.0517-35.29645] → minaret [il-minaret-32.07151-35.29369] |
| קריות (il-32.0707-35.2937) | flat | minaret [il-minaret-32.03671-35.28552]; minaret [il-minaret-32.06497-35.30312]; minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.06497-35.30312]; minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.06497-35.30312]; minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.06497-35.30312]; minaret [il-minaret-32.07151-35.29369] | minaret [il-minaret-32.03671-35.28552]; minaret [il-minaret-32.06497-35.30312]; minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.06497-35.30312]; minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.06497-35.30312]; minaret [il-minaret-32.07151-35.29369] → minaret [il-minaret-32.06497-35.30312]; minaret [il-minaret-32.07151-35.29369] |
| ג'אלוד (il-32.0677-35.3164) | flat | minaret [il-minaret-32.05687-35.3672]; minaret [il-minaret-32.06497-35.30312] → minaret [il-minaret-32.06497-35.30312] → minaret [il-minaret-32.06497-35.30312] → minaret [il-minaret-32.06497-35.30312] | minaret [il-minaret-32.05687-35.3672]; minaret [il-minaret-32.06497-35.30312] → minaret [il-minaret-32.06497-35.30312] → minaret [il-minaret-32.06497-35.30312] → minaret [il-minaret-32.06497-35.30312] |
| היובל (il-32.0682-35.2863) | flat | 0 → 0 → minaret [il-minaret-32.07151-35.29369] → 0 | 0 → 0 → minaret [il-minaret-32.07151-35.29369] → 0 |
| א-סאוויה (il-32.0846-35.2580) | flat | minaret [il-minaret-32.08488-35.25792] → minaret [il-minaret-32.07157-35.24342]; minaret [il-minaret-32.08488-35.25792] → minaret [il-minaret-32.07157-35.24342]; minaret [il-minaret-32.08488-35.25792] → minaret [il-minaret-32.07157-35.24342]; minaret [il-minaret-32.08488-35.25792] | minaret [il-minaret-32.08488-35.25792] → minaret [il-minaret-32.07157-35.24342]; minaret [il-minaret-32.08488-35.25792] → minaret [il-minaret-32.07157-35.24342]; minaret [il-minaret-32.08488-35.25792] → minaret [il-minaret-32.07157-35.24342]; minaret [il-minaret-32.08488-35.25792] |
| תלפית (il-32.0862-35.2915) | flat | minaret [il-minaret-32.08551-35.29249] → minaret [il-minaret-32.08551-35.29249] → minaret [il-minaret-32.08551-35.29249] → minaret [il-minaret-32.08551-35.29249] | minaret [il-minaret-32.08551-35.29249] → minaret [il-minaret-32.08551-35.29249] → minaret [il-minaret-32.08551-35.29249] → minaret [il-minaret-32.08551-35.29249] |
| פלגי מים (il-32.0880-35.2747) | flat | synagogue [il-synagogue-32.0875-35.27397] → minaret [il-minaret-32.07151-35.29369]; synagogue [il-synagogue-32.0875-35.27397] → minaret [il-minaret-32.07151-35.29369]; minaret [il-minaret-32.08551-35.29249]; synagogue [il-synagogue-32.0875-35.27397] → minaret [il-minaret-32.07151-35.29369]; minaret [il-minaret-32.08551-35.29249]; synagogue [il-synagogue-32.0875-35.27397] | synagogue [il-synagogue-32.0875-35.27397] → minaret [il-minaret-32.07151-35.29369]; synagogue [il-synagogue-32.0875-35.27397] → minaret [il-minaret-32.07151-35.29369]; minaret [il-minaret-32.08551-35.29249]; synagogue [il-synagogue-32.0875-35.27397] → minaret [il-minaret-32.07151-35.29369]; minaret [il-minaret-32.08551-35.29249]; synagogue [il-synagogue-32.0875-35.27397] |
| קבלאן (il-32.1022-35.2877) | flat | minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10258-35.28683]; minaret [il-minaret-32.1035-35.27784] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10258-35.28683]; minaret [il-minaret-32.1035-35.27784] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10258-35.28683]; minaret [il-minaret-32.1035-35.27784] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10258-35.28683]; minaret [il-minaret-32.1035-35.27784] | minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10258-35.28683]; minaret [il-minaret-32.1035-35.27784] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10258-35.28683]; minaret [il-minaret-32.1035-35.27784] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10258-35.28683]; minaret [il-minaret-32.1035-35.27784] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10258-35.28683]; minaret [il-minaret-32.1035-35.27784] |
| נופי נחמיה (il-32.0983-35.2360) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רחלים (il-32.1028-35.2570) | flat | 0 → 0 → minaret [il-minaret-32.1035-35.27784] → minaret [il-minaret-32.1035-35.27784] | 0 → 0 → minaret [il-minaret-32.1035-35.27784] → minaret [il-minaret-32.1035-35.27784] |
| יתמא (il-32.1091-35.2693) | flat | minaret [il-minaret-32.08272-35.25577]; minaret [il-minaret-32.09968-35.28414]; minaret [il-minaret-32.10795-35.2687] → minaret [il-minaret-32.10795-35.2687] → minaret [il-minaret-32.10795-35.2687]; minaret [il-minaret-32.10917-35.23825]; synagogue [il-synagogue-32.11755-35.2501] → minaret [il-minaret-32.10795-35.2687]; minaret [il-minaret-32.10917-35.23825] | minaret [il-minaret-32.08272-35.25577]; minaret [il-minaret-32.09968-35.28414]; minaret [il-minaret-32.10795-35.2687] → minaret [il-minaret-32.10795-35.2687] → minaret [il-minaret-32.10795-35.2687]; minaret [il-minaret-32.10917-35.23825]; synagogue [il-synagogue-32.11755-35.2501] → minaret [il-minaret-32.10795-35.2687]; minaret [il-minaret-32.10917-35.23825] |
| אל-מוע'ייר (il-32.0198-35.3462) | flat | minaret [il-minaret-32.0203-35.34667] → minaret [il-minaret-32.0203-35.34667] → minaret [il-minaret-32.0203-35.34667] → minaret [il-minaret-32.0203-35.34667] | minaret [il-minaret-32.0203-35.34667] → minaret [il-minaret-32.0203-35.34667] → minaret [il-minaret-32.0203-35.34667] → minaret [il-minaret-32.0203-35.34667] |
| מלאכי השלום (il-32.0253-35.3648) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עדי עד (il-32.0414-35.3346) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עמיחי (il-32.0458-35.3278) | flat | minaret [il-minaret-32.0203-35.34667] → 0 → 0 → 0 | minaret [il-minaret-32.0203-35.34667] → 0 → 0 → 0 |
| גאולת ציון (il-32.0461-35.3231) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ישוב הדעת (il-32.0467-35.3404) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קידה (il-32.0508-35.3404) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שבות רחל (il-32.0547-35.3115) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קידה מזרח (il-32.0517-35.3460) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אחיה (il-32.0608-35.3276) | flat | 0 → synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] | 0 → synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] → synagogue [il-synagogue-32.05331-35.29996] |
| אש קודש (il-32.0654-35.3359) | flat | minaret [il-minaret-32.05687-35.3672] → 0 → 0 → 0 | minaret [il-minaret-32.05687-35.3672] → 0 → 0 → 0 |
| מג׳דל בני פאדל (il-32.0836-35.3633) | flat | minaret [il-minaret-32.08393-35.36424] → minaret [il-minaret-32.08393-35.36424] → minaret [il-minaret-32.08393-35.36424] → minaret [il-minaret-32.08393-35.36424] | minaret [il-minaret-32.08393-35.36424] → minaret [il-minaret-32.08393-35.36424] → minaret [il-minaret-32.08393-35.36424] → minaret [il-minaret-32.08393-35.36424] |
| קוסרא (il-32.0843-35.3304) | flat | minaret [il-minaret-32.05687-35.3672]; minaret [il-minaret-32.08145-35.33348]; minaret [il-minaret-32.0852-35.33023]; minaret [il-minaret-32.08521-35.33757]; minaret [il-minaret-32.09017-35.32512] → minaret [il-minaret-32.08145-35.33348]; minaret [il-minaret-32.0852-35.33023]; minaret [il-minaret-32.08521-35.33757]; minaret [il-minaret-32.09017-35.32512] → minaret [il-minaret-32.08145-35.33348]; minaret [il-minaret-32.0852-35.33023]; minaret [il-minaret-32.08521-35.33757]; minaret [il-minaret-32.09017-35.32512] → minaret [il-minaret-32.08145-35.33348]; minaret [il-minaret-32.0852-35.33023]; minaret [il-minaret-32.08521-35.33757]; minaret [il-minaret-32.09017-35.32512] | minaret [il-minaret-32.05687-35.3672]; minaret [il-minaret-32.08145-35.33348]; minaret [il-minaret-32.0852-35.33023]; minaret [il-minaret-32.08521-35.33757]; minaret [il-minaret-32.09017-35.32512] → minaret [il-minaret-32.08145-35.33348]; minaret [il-minaret-32.0852-35.33023]; minaret [il-minaret-32.08521-35.33757]; minaret [il-minaret-32.09017-35.32512] → minaret [il-minaret-32.08145-35.33348]; minaret [il-minaret-32.0852-35.33023]; minaret [il-minaret-32.08521-35.33757]; minaret [il-minaret-32.09017-35.32512] → minaret [il-minaret-32.08145-35.33348]; minaret [il-minaret-32.0852-35.33023]; minaret [il-minaret-32.08521-35.33757]; minaret [il-minaret-32.09017-35.32512] |
| מגדלים (il-32.0899-35.3423) | flat | synagogue [il-synagogue-32.09003-35.3423] → synagogue [il-synagogue-32.09003-35.3423] → minaret [il-minaret-32.09017-35.32512]; synagogue [il-synagogue-32.09003-35.3423] → minaret [il-minaret-32.09017-35.32512]; synagogue [il-synagogue-32.09003-35.3423] | synagogue [il-synagogue-32.09003-35.3423] → synagogue [il-synagogue-32.09003-35.3423] → minaret [il-minaret-32.09017-35.32512]; synagogue [il-synagogue-32.09003-35.3423] → minaret [il-minaret-32.09017-35.32512]; synagogue [il-synagogue-32.09003-35.3423] |
| ג'וריש (il-32.1019-35.3227) | flat | minaret [il-minaret-32.10152-35.32202] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10152-35.32202] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10152-35.32202] → minaret [il-minaret-32.10152-35.32202] | minaret [il-minaret-32.10152-35.32202] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10152-35.32202] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10152-35.32202] → minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.10152-35.32202] |
| גיתית (il-32.1015-35.3962) | flat | 0 → 0 → minaret [il-minaret-32.08393-35.36424] → minaret [il-minaret-32.08393-35.36424] | 0 → 0 → minaret [il-minaret-32.08393-35.36424] → minaret [il-minaret-32.08393-35.36424] |
| תומר (il-32.0187-35.4392) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פסאיל (il-32.0260-35.4447) | flat | minaret [il-minaret-32.02626-35.44387] → minaret [il-minaret-32.02626-35.44387] → minaret [il-minaret-32.02626-35.44387] → minaret [il-minaret-32.02626-35.44387] | minaret [il-minaret-32.02626-35.44387] → minaret [il-minaret-32.02626-35.44387] → minaret [il-minaret-32.02626-35.44387] → minaret [il-minaret-32.02626-35.44387] |
| פסאילאל-ווסטא (il-32.0307-35.4399) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פסאייל אל פוקה (il-32.0344-35.4365) | flat | minaret [il-minaret-32.03259-35.43701] → minaret [il-minaret-32.03259-35.43701] → minaret [il-minaret-32.03259-35.43701] → minaret [il-minaret-32.03259-35.43701] | minaret [il-minaret-32.03259-35.43701] → minaret [il-minaret-32.03259-35.43701] → minaret [il-minaret-32.03259-35.43701] → minaret [il-minaret-32.03259-35.43701] |
| פצאל (il-32.0438-35.4423) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יפית (il-32.0623-35.4743) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעלה אפרים (il-32.0708-35.4034) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שלומציון (il-32.0996-35.4941) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נווה ירק (il-32.1333-34.9242) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עזבת סלמאן (il-32.1432-34.9973) | flat | 0 → synagogue [il-synagogue-32.13671-34.9893] → synagogue [il-synagogue-32.13671-34.9893] → synagogue [il-synagogue-32.13671-34.9893] | 0 → synagogue [il-synagogue-32.13671-34.9893] → synagogue [il-synagogue-32.13671-34.9893] → synagogue [il-synagogue-32.13671-34.9893] |
| נירית (il-32.1466-34.9844) | flat | synagogue [il-synagogue-32.146-34.98618] → synagogue [il-synagogue-32.146-34.98618] → synagogue [il-synagogue-32.146-34.98618] → synagogue [il-synagogue-32.146-34.98618] | synagogue [il-synagogue-32.146-34.98618] → synagogue [il-synagogue-32.146-34.98618] → synagogue [il-synagogue-32.146-34.98618] → synagogue [il-synagogue-32.146-34.98618] |
| עזבת ג'לעוד (il-32.1511-34.9986) | flat | 0 → synagogue [il-synagogue-32.13671-34.9893] → synagogue [il-synagogue-32.13671-34.9893] → 0 | 0 → synagogue [il-synagogue-32.13671-34.9893] → synagogue [il-synagogue-32.13671-34.9893] → 0 |
| ירחיב (il-32.1531-34.9683) | flat | minaret [il-minaret-32.1309-34.97182]; minaret [il-minaret-32.18783-34.80582] → 0 → synagogue [il-synagogue-32.13671-34.9893]; synagogue [il-synagogue-32.146-34.98618] → synagogue [il-synagogue-32.146-34.98618] | minaret [il-minaret-32.1309-34.97182]; minaret [il-minaret-32.18783-34.80582] → synagogue [il-synagogue-32.13671-34.9893] → synagogue [il-synagogue-32.13671-34.9893]; synagogue [il-synagogue-32.146-34.98618] → synagogue [il-synagogue-32.146-34.98618] |
| מתן (il-32.1561-34.9743) | flat | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 |
| חבלה (il-32.1647-34.9768) | flat | minaret [il-minaret-32.16177-34.97855]; minaret [il-minaret-32.16563-34.97649]; minaret [il-minaret-32.18783-34.80582] → minaret [il-minaret-32.16177-34.97855]; minaret [il-minaret-32.16563-34.97649] → minaret [il-minaret-32.16177-34.97855]; minaret [il-minaret-32.16563-34.97649] → minaret [il-minaret-32.16177-34.97855]; minaret [il-minaret-32.16563-34.97649] | minaret [il-minaret-32.16177-34.97855]; minaret [il-minaret-32.16563-34.97649]; minaret [il-minaret-32.18783-34.80582] → minaret [il-minaret-32.16177-34.97855]; minaret [il-minaret-32.16563-34.97649] → minaret [il-minaret-32.16177-34.97855]; minaret [il-minaret-32.16563-34.97649] → minaret [il-minaret-32.16177-34.97855]; minaret [il-minaret-32.16563-34.97649] |
| ראס עטיה (il-32.1598-34.9885) | flat | 0 → 0 → 0 → 0 | 0 → minaret [il-minaret-32.15067-34.95301] → minaret [il-minaret-32.15067-34.95301] → 0 |
| ערב א-רמאד'ין אל-ג'נובי (il-32.1744-34.9896) | flat | minaret [il-minaret-32.20448-35.13156] → 0 → synagogue [il-synagogue-32.17833-35.01277] → synagogue [il-synagogue-32.17833-35.01277] | minaret [il-minaret-32.20448-35.13156] → 0 → synagogue [il-synagogue-32.17833-35.01277] → synagogue [il-synagogue-32.17833-35.01277] |
| קלקיליה (il-32.1881-34.9679) | flat | minaret [il-minaret-32.15067-34.95301]; minaret [il-minaret-32.18946-34.97129] → minaret [il-minaret-32.18946-34.97129] → minaret [il-minaret-32.18946-34.97129] → minaret [il-minaret-32.18946-34.97129] | minaret [il-minaret-32.15067-34.95301]; minaret [il-minaret-32.18946-34.97129] → minaret [il-minaret-32.18946-34.97129] → minaret [il-minaret-32.18946-34.97129] → minaret [il-minaret-32.18946-34.97129] |
| אבו סנינא (il-32.1837-34.9558) | flat | minaret [il-minaret-32.17925-34.94469]; minaret [il-minaret-32.18281-34.97417]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.17925-34.94469] → minaret [il-minaret-32.17925-34.94469] → minaret [il-minaret-32.17925-34.94469] | minaret [il-minaret-32.17925-34.94469]; minaret [il-minaret-32.18281-34.97417]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.17925-34.94469] → minaret [il-minaret-32.17925-34.94469] → minaret [il-minaret-32.17925-34.94469] |
| ניר אליהו (il-32.1974-34.9484) | flat | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 |
| צופים (il-32.1982-35.0097) | flat | minaret [il-minaret-32.18896-34.9772]; minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 | minaret [il-minaret-32.18896-34.9772]; minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 |
| סרטה (il-32.1034-35.0925) | flat | minaret [il-minaret-32.10428-35.09089] → minaret [il-minaret-32.10428-35.09089] → minaret [il-minaret-32.10428-35.09089] → minaret [il-minaret-32.10428-35.09089] | minaret [il-minaret-32.10428-35.09089] → minaret [il-minaret-32.10428-35.09089] → minaret [il-minaret-32.10428-35.09089] → minaret [il-minaret-32.10428-35.09089] |
| בידיא (il-32.1147-35.0756) | flat | minaret [il-minaret-32.11347-35.07555] → minaret [il-minaret-32.11347-35.07555] → minaret [il-minaret-32.11347-35.07555] → minaret [il-minaret-32.11347-35.07555] | minaret [il-minaret-32.11347-35.07555] → minaret [il-minaret-32.11347-35.07555] → minaret [il-minaret-32.11347-35.07555] → minaret [il-minaret-32.11347-35.07555] |
| מסחה (il-32.1100-35.0511) | flat | minaret [il-minaret-32.10812-35.05099] → minaret [il-minaret-32.10812-35.05099] → minaret [il-minaret-32.10812-35.05099]; synagogue [il-synagogue-32.10693-35.03447] → minaret [il-minaret-32.10812-35.05099] | minaret [il-minaret-32.10812-35.05099] → minaret [il-minaret-32.10812-35.05099] → minaret [il-minaret-32.10812-35.05099]; synagogue [il-synagogue-32.10693-35.03447] → minaret [il-minaret-32.10812-35.05099] |
| אלקנה (il-32.1116-35.0355) | flat | synagogue [il-synagogue-32.11042-35.03747] → synagogue [il-synagogue-32.11042-35.03747] → synagogue [il-synagogue-32.11042-35.03747] → synagogue [il-synagogue-32.11042-35.03747] | synagogue [il-synagogue-32.11042-35.03747] → synagogue [il-synagogue-32.11042-35.03747] → synagogue [il-synagogue-32.11042-35.03747] → synagogue [il-synagogue-32.11042-35.03747] |
| עץ אפרים (il-32.1192-35.0469) | flat | synagogue [il-synagogue-32.11959-35.04762] → synagogue [il-synagogue-32.11959-35.04762] → synagogue [il-synagogue-32.11959-35.04762] → synagogue [il-synagogue-32.11959-35.04762] | synagogue [il-synagogue-32.11959-35.04762] → synagogue [il-synagogue-32.11959-35.04762] → synagogue [il-synagogue-32.11959-35.04762] → synagogue [il-synagogue-32.10693-35.03447]; synagogue [il-synagogue-32.11959-35.04762] |
| שערי תקוה (il-32.1206-35.0293) | flat | 0 → synagogue [il-synagogue-32.11042-35.03747] → synagogue [il-synagogue-32.11042-35.03747] → 0 | 0 → synagogue [il-synagogue-32.11042-35.03747] → synagogue [il-synagogue-32.11042-35.03747] → 0 |
| בית אמין (il-32.1318-35.0211) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עזון עתמה (il-32.1230-35.0170) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מגן דן (il-32.1103-35.0211) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קרואת בני חסן (il-32.1258-35.0993) | flat | minaret [il-minaret-32.11508-35.14247]; minaret [il-minaret-32.12781-35.09968] → minaret [il-minaret-32.12781-35.09968] → minaret [il-minaret-32.12781-35.09968] → minaret [il-minaret-32.12781-35.09968] | minaret [il-minaret-32.11508-35.14247]; minaret [il-minaret-32.12781-35.09968] → minaret [il-minaret-32.12781-35.09968] → minaret [il-minaret-32.12781-35.09968] → minaret [il-minaret-32.12781-35.09968] |
| סניריא (il-32.1290-35.0474) | flat | minaret [il-minaret-32.12802-35.05128]; minaret [il-minaret-32.12865-35.04687] → minaret [il-minaret-32.12802-35.05128]; minaret [il-minaret-32.12865-35.04687] → minaret [il-minaret-32.12802-35.05128]; minaret [il-minaret-32.12865-35.04687] → minaret [il-minaret-32.12802-35.05128]; minaret [il-minaret-32.12865-35.04687] | minaret [il-minaret-32.12802-35.05128]; minaret [il-minaret-32.12865-35.04687] → minaret [il-minaret-32.12802-35.05128]; minaret [il-minaret-32.12865-35.04687] → minaret [il-minaret-32.12802-35.05128]; minaret [il-minaret-32.12865-35.04687] → minaret [il-minaret-32.12802-35.05128]; minaret [il-minaret-32.12865-35.04687] |
| חוות דורות (il-32.1372-35.0619) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עזבת אל-אשקר (il-32.1405-35.0203) | flat | minaret [il-minaret-32.14043-35.0197] → minaret [il-minaret-32.14043-35.0197]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14043-35.0197]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14043-35.0197] | minaret [il-minaret-32.14043-35.0197] → minaret [il-minaret-32.14043-35.0197]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14043-35.0197]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14043-35.0197]; synagogue [il-synagogue-32.13671-34.9893] |
| אל-מודוור (il-32.1433-35.0122) | flat | minaret [il-minaret-32.14314-35.01266] → minaret [il-minaret-32.14314-35.01266]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14314-35.01266]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14314-35.01266] | minaret [il-minaret-32.14314-35.01266] → minaret [il-minaret-32.14314-35.01266]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14314-35.01266]; synagogue [il-synagogue-32.13671-34.9893] → minaret [il-minaret-32.14314-35.01266]; synagogue [il-synagogue-32.13671-34.9893] |
| כפר ת'ולת' (il-32.1528-35.0463) | flat | minaret [il-minaret-32.15222-35.04571]; minaret [il-minaret-32.153-35.05014] → minaret [il-minaret-32.15222-35.04571]; minaret [il-minaret-32.153-35.05014] → minaret [il-minaret-32.15222-35.04571]; minaret [il-minaret-32.153-35.05014] → minaret [il-minaret-32.15222-35.04571]; minaret [il-minaret-32.153-35.05014] | minaret [il-minaret-32.15222-35.04571]; minaret [il-minaret-32.153-35.05014] → minaret [il-minaret-32.15222-35.04571]; minaret [il-minaret-32.153-35.05014] → minaret [il-minaret-32.15222-35.04571]; minaret [il-minaret-32.153-35.05014] → minaret [il-minaret-32.15222-35.04571]; minaret [il-minaret-32.153-35.05014] |
| Shlul Al Raba'a - Kafr thulth town (il-32.1536-35.0588) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נופים (il-32.1553-35.1009) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חוות יאיר (il-32.1443-35.1048) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יקיר (il-32.1494-35.1145) | flat | minaret [il-minaret-32.1311-35.13878]; synagogue [il-synagogue-32.14963-35.11448] → synagogue [il-synagogue-32.14963-35.11448] → synagogue [il-synagogue-32.14963-35.11448] → synagogue [il-synagogue-32.14963-35.11448] | minaret [il-minaret-32.1311-35.13878]; synagogue [il-synagogue-32.14963-35.11448] → synagogue [il-synagogue-32.14963-35.11448] → synagogue [il-synagogue-32.14963-35.11448] → synagogue [il-synagogue-32.14963-35.11448] |
| ראס טירה (il-32.1619-35.0101) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אלפי מנשה (il-32.1731-35.0158) | flat | minaret [il-minaret-32.20448-35.13156]; synagogue [il-synagogue-32.17341-35.01407] → synagogue [il-synagogue-32.17341-35.01407] → synagogue [il-synagogue-32.17341-35.01407] → synagogue [il-synagogue-32.17341-35.01407] | minaret [il-minaret-32.20448-35.13156]; synagogue [il-synagogue-32.17341-35.01407] → synagogue [il-synagogue-32.17341-35.01407] → synagogue [il-synagogue-32.17341-35.01407] → synagogue [il-synagogue-32.17341-35.01407] |
| נבי אליאס (il-32.1845-35.0177) | flat | minaret [il-minaret-32.18529-35.01651] → minaret [il-minaret-32.17792-35.05551]; minaret [il-minaret-32.18529-35.01651] → minaret [il-minaret-32.17792-35.05551]; minaret [il-minaret-32.18529-35.01651] → minaret [il-minaret-32.18529-35.01651] | minaret [il-minaret-32.18529-35.01651] → minaret [il-minaret-32.17792-35.05551]; minaret [il-minaret-32.18529-35.01651] → minaret [il-minaret-32.17792-35.05551]; minaret [il-minaret-32.18529-35.01651] → minaret [il-minaret-32.17792-35.05551]; minaret [il-minaret-32.18529-35.01651] |
| עזבת טביב (il-32.1819-35.0337) | flat | minaret [il-minaret-32.18195-35.03397] → minaret [il-minaret-32.18195-35.03397] → minaret [il-minaret-32.18195-35.03397] → minaret [il-minaret-32.18195-35.03397] | minaret [il-minaret-32.18195-35.03397] → minaret [il-minaret-32.18195-35.03397] → minaret [il-minaret-32.18195-35.03397] → minaret [il-minaret-32.18195-35.03397] |
| כפר לאקף (il-32.1831-35.0914) | flat | minaret [il-minaret-32.17792-35.05551]; minaret [il-minaret-32.18286-35.09111] → minaret [il-minaret-32.18286-35.09111] → minaret [il-minaret-32.18286-35.09111] → minaret [il-minaret-32.18286-35.09111] | minaret [il-minaret-32.17792-35.05551]; minaret [il-minaret-32.18286-35.09111] → minaret [il-minaret-32.18286-35.09111] → minaret [il-minaret-32.18286-35.09111] → minaret [il-minaret-32.18286-35.09111] |
| עזון (il-32.1761-35.0588) | flat | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 |
| עסלה (il-32.1728-35.0341) | flat | minaret [il-minaret-32.17251-35.03642] → minaret [il-minaret-32.17251-35.03642] → minaret [il-minaret-32.17251-35.03642]; minaret [il-minaret-32.17792-35.05551] → minaret [il-minaret-32.17251-35.03642]; minaret [il-minaret-32.17792-35.05551] | minaret [il-minaret-32.17251-35.03642] → minaret [il-minaret-32.17251-35.03642] → minaret [il-minaret-32.17251-35.03642]; minaret [il-minaret-32.17792-35.05551] → minaret [il-minaret-32.17251-35.03642]; minaret [il-minaret-32.17792-35.05551] |
| חרבת סיר (il-32.1960-35.0605) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג'יוס (il-32.2007-35.0354) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חארס (il-32.1140-35.1406) | flat | minaret [il-minaret-32.0912-35.17035]; minaret [il-minaret-32.11329-35.13967]; minaret [il-minaret-32.11508-35.14247] → minaret [il-minaret-32.11329-35.13967]; minaret [il-minaret-32.11508-35.14247] → minaret [il-minaret-32.11329-35.13967]; minaret [il-minaret-32.11508-35.14247] → minaret [il-minaret-32.11329-35.13967]; minaret [il-minaret-32.11508-35.14247] | minaret [il-minaret-32.0912-35.17035]; minaret [il-minaret-32.11329-35.13967]; minaret [il-minaret-32.11508-35.14247] → minaret [il-minaret-32.11329-35.13967]; minaret [il-minaret-32.11508-35.14247] → minaret [il-minaret-32.11329-35.13967]; minaret [il-minaret-32.11508-35.14247] → minaret [il-minaret-32.11329-35.13967]; minaret [il-minaret-32.11508-35.14247] |
| רבבה (il-32.1191-35.1276) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דיר איסתיא (il-32.1291-35.1409) | flat | minaret [il-minaret-32.1311-35.13878] → minaret [il-minaret-32.1311-35.13878] → minaret [il-minaret-32.1311-35.13878] → minaret [il-minaret-32.1311-35.13878] | minaret [il-minaret-32.1311-35.13878] → minaret [il-minaret-32.1311-35.13878] → minaret [il-minaret-32.1311-35.13878] → minaret [il-minaret-32.1311-35.13878] |
| ג'מאעין (il-32.1317-35.2022) | flat | minaret [il-minaret-32.10917-35.23825]; minaret [il-minaret-32.13092-35.20015]; minaret [il-minaret-32.1315-35.20906] → minaret [il-minaret-32.13092-35.20015]; minaret [il-minaret-32.1315-35.20906] → minaret [il-minaret-32.13092-35.20015]; minaret [il-minaret-32.1315-35.20906] → minaret [il-minaret-32.13092-35.20015]; minaret [il-minaret-32.1315-35.20906] | minaret [il-minaret-32.10917-35.23825]; minaret [il-minaret-32.13092-35.20015]; minaret [il-minaret-32.1315-35.20906] → minaret [il-minaret-32.13092-35.20015]; minaret [il-minaret-32.1315-35.20906] → minaret [il-minaret-32.13092-35.20015]; minaret [il-minaret-32.1315-35.20906] → minaret [il-minaret-32.13092-35.20015]; minaret [il-minaret-32.1315-35.20906] |
| עמנואל (il-32.1619-35.1361) | flat | synagogue [il-synagogue-32.16234-35.14003] → synagogue [il-synagogue-32.16234-35.14003] → synagogue [il-synagogue-32.16234-35.14003] → synagogue [il-synagogue-32.16234-35.14003] | synagogue [il-synagogue-32.16234-35.14003] → synagogue [il-synagogue-32.16234-35.14003] → synagogue [il-synagogue-32.16234-35.14003] → synagogue [il-synagogue-32.16234-35.14003] |
| אלוני שילה (il-32.1630-35.1201) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג'ינסאפות (il-32.1801-35.1304) | flat | minaret [il-minaret-32.17931-35.13054] → minaret [il-minaret-32.17931-35.13054] → minaret [il-minaret-32.17931-35.13054] → minaret [il-minaret-32.17931-35.13054] | minaret [il-minaret-32.17931-35.13054] → minaret [il-minaret-32.17931-35.13054] → minaret [il-minaret-32.17931-35.13054] → minaret [il-minaret-32.17931-35.13054] |
| רמת גלעד (il-32.1784-35.1144) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חוות יתדות (il-32.1910-35.1825) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חוות גלעד (il-32.1995-35.1816) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| באקת אל-חטב (il-32.2046-35.1151) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| איסכאכא (il-32.1028-35.2243) | flat | minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → 0 → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → 0 | minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → 0 → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → 0 |
| יאסוף (il-32.1098-35.2399) | flat | minaret [il-minaret-32.08272-35.25577]; minaret [il-minaret-32.08488-35.25792]; minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] | minaret [il-minaret-32.08272-35.25577]; minaret [il-minaret-32.08488-35.25792]; minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] |
| כפר תפוח (il-32.1191-35.2501) | flat | 0 → minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] | 0 → minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] → minaret [il-minaret-32.10482-35.23336]; minaret [il-minaret-32.10917-35.23825] |
| ביתא (il-32.1423-35.2857) | flat | minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866]; minaret [il-minaret-32.14923-35.25826] → minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866] → minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866] → minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866] | minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866]; minaret [il-minaret-32.14923-35.25826] → minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866] → minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866] → minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866] |
| חוארה (il-32.1521-35.2571) | flat | minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866]; minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15231-35.25692] | minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.14339-35.2866]; minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15231-35.25692] |
| אודלא (il-32.1554-35.2762) | flat | minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15267-35.27671]; minaret [il-minaret-32.16135-35.29311] → minaret [il-minaret-32.15267-35.27671] → minaret [il-minaret-32.15267-35.27671]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] → minaret [il-minaret-32.15267-35.27671] | minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.15267-35.27671]; minaret [il-minaret-32.16135-35.29311] → minaret [il-minaret-32.15267-35.27671] → minaret [il-minaret-32.15267-35.27671]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] → minaret [il-minaret-32.15231-35.25692]; minaret [il-minaret-32.15267-35.27671] |
| עוורתא (il-32.1616-35.2858) | flat | minaret [il-minaret-32.12506-35.30978]; minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.16123-35.28369]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] → minaret [il-minaret-32.16123-35.28369]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] → minaret [il-minaret-32.16123-35.28369]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] → minaret [il-minaret-32.16123-35.28369]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] | minaret [il-minaret-32.12506-35.30978]; minaret [il-minaret-32.14923-35.25826]; minaret [il-minaret-32.16123-35.28369]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] → minaret [il-minaret-32.16123-35.28369]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] → minaret [il-minaret-32.16123-35.28369]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] → minaret [il-minaret-32.16123-35.28369]; minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711] |
| עינאבוס (il-32.1481-35.2455) | flat | minaret [il-minaret-32.1315-35.20906]; minaret [il-minaret-32.13829-35.28458]; minaret [il-minaret-32.14737-35.24474] → minaret [il-minaret-32.14737-35.24474] → minaret [il-minaret-32.14737-35.24474] → minaret [il-minaret-32.14737-35.24474] | minaret [il-minaret-32.1315-35.20906]; minaret [il-minaret-32.13829-35.28458]; minaret [il-minaret-32.14737-35.24474] → minaret [il-minaret-32.14737-35.24474] → minaret [il-minaret-32.14737-35.24474] → minaret [il-minaret-32.14737-35.24474] |
| עוריף (il-32.1594-35.2253) | flat | minaret [il-minaret-32.1315-35.20906] → 0 → 0 → 0 | minaret [il-minaret-32.1315-35.20906] → 0 → 0 → 0 |
| קומי אורי (il-32.1581-35.2368) | flat | synagogue [il-synagogue-32.15754-35.23638] → synagogue [il-synagogue-32.15754-35.23638] → synagogue [il-synagogue-32.15754-35.23638] → synagogue [il-synagogue-32.15754-35.23638] | synagogue [il-synagogue-32.15754-35.23638] → synagogue [il-synagogue-32.15754-35.23638] → synagogue [il-synagogue-32.15754-35.23638] → minaret [il-minaret-32.14923-35.25826]; synagogue [il-synagogue-32.15754-35.23638] |
| חוות שקד (il-32.1626-35.2406) | flat | 0 → minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.15231-35.25692] | 0 → minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.15231-35.25692] |
| יצהר (il-32.1686-35.2338) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שכונת הקראוונים (il-32.1691-35.2393) | flat | synagogue [il-synagogue-32.16703-35.23832] → minaret [il-minaret-32.15231-35.25692]; synagogue [il-synagogue-32.16703-35.23832] → minaret [il-minaret-32.15231-35.25692]; synagogue [il-synagogue-32.16703-35.23832] → minaret [il-minaret-32.15231-35.25692]; synagogue [il-synagogue-32.16703-35.23832] | synagogue [il-synagogue-32.16703-35.23832] → minaret [il-minaret-32.15231-35.25692]; synagogue [il-synagogue-32.16703-35.23832] → minaret [il-minaret-32.15231-35.25692]; synagogue [il-synagogue-32.16703-35.23832] → minaret [il-minaret-32.15231-35.25692]; synagogue [il-synagogue-32.16703-35.23832] |
| תקומה (il-32.1581-35.2420) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| להבה (il-32.1624-35.2474) | flat | 0 → minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.15231-35.25692] → 0 | 0 → minaret [il-minaret-32.15231-35.25692] → minaret [il-minaret-32.15231-35.25692] → 0 |
| שלהבת (il-32.1706-35.2282) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שלהבת-יה (il-32.1723-35.2233) | flat | synagogue [il-synagogue-32.1718-35.22362] → synagogue [il-synagogue-32.1718-35.22362] → synagogue [il-synagogue-32.1718-35.22362] → synagogue [il-synagogue-32.1718-35.22362] | synagogue [il-synagogue-32.1718-35.22362] → synagogue [il-synagogue-32.1718-35.22362] → synagogue [il-synagogue-32.1718-35.22362] → synagogue [il-synagogue-32.1718-35.22362] |
| עסירה אל-קבליה (il-32.1791-35.2159) | flat | minaret [il-minaret-32.17886-35.21415]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.17886-35.21415] → minaret [il-minaret-32.17886-35.21415] → minaret [il-minaret-32.17886-35.21415] | minaret [il-minaret-32.17886-35.21415]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.17886-35.21415] → minaret [il-minaret-32.17886-35.21415] → minaret [il-minaret-32.17886-35.21415] |
| מאדמא (il-32.1856-35.2313) | flat | minaret [il-minaret-32.18472-35.23138]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.18472-35.23138] → minaret [il-minaret-32.18472-35.23138] → minaret [il-minaret-32.18472-35.23138] | minaret [il-minaret-32.18472-35.23138]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.18472-35.23138] → minaret [il-minaret-32.18472-35.23138] → minaret [il-minaret-32.18472-35.23138] |
| סנה יעקב (il-32.1786-35.2624) | flat | minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.18386-35.25018]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.15231-35.25692]; minaret [il-minaret-32.15777-35.25984] → minaret [il-minaret-32.15777-35.25984]; minaret [il-minaret-32.18386-35.25018] → minaret [il-minaret-32.15777-35.25984]; minaret [il-minaret-32.18386-35.25018] | minaret [il-minaret-32.14206-35.28337]; minaret [il-minaret-32.18386-35.25018]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.15231-35.25692]; minaret [il-minaret-32.16135-35.29311] → minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.18386-35.25018] → minaret [il-minaret-32.15777-35.25984]; minaret [il-minaret-32.18386-35.25018] |
| בורין (il-32.1832-35.2501) | flat | minaret [il-minaret-32.15231-35.25692]; minaret [il-minaret-32.18386-35.25018]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.18386-35.25018] → minaret [il-minaret-32.18386-35.25018] → minaret [il-minaret-32.18386-35.25018] | minaret [il-minaret-32.15231-35.25692]; minaret [il-minaret-32.18386-35.25018]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.18386-35.25018] → minaret [il-minaret-32.18386-35.25018] → minaret [il-minaret-32.18386-35.25018] |
| כפר קליל (il-32.1913-35.2758) | flat | minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.18386-35.25018]; minaret [il-minaret-32.19203-35.27499]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.19203-35.27499] → minaret [il-minaret-32.19203-35.27499]; synagogue [il-synagogue-32.1925-35.26473] → minaret [il-minaret-32.19203-35.27499] | minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.18386-35.25018]; minaret [il-minaret-32.19203-35.27499]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.19203-35.27499] → minaret [il-minaret-32.19203-35.27499]; synagogue [il-synagogue-32.1925-35.26473] → minaret [il-minaret-32.19203-35.27499] |
| מ.פ. בלטה (il-32.2055-35.2865) | flat | minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.19011-35.29316]; minaret [il-minaret-32.20448-35.13156]; minaret [il-minaret-32.20797-35.28696] → minaret [il-minaret-32.20797-35.28696] → minaret [il-minaret-32.20797-35.28696]; minaret [il-minaret-32.2156-35.26668] → minaret [il-minaret-32.20797-35.28696] | minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.19011-35.29316]; minaret [il-minaret-32.20448-35.13156]; minaret [il-minaret-32.20797-35.28696] → minaret [il-minaret-32.20797-35.28696] → minaret [il-minaret-32.20797-35.28696]; minaret [il-minaret-32.2156-35.26668] → minaret [il-minaret-32.20797-35.28696] |
| רוג'יב (il-32.1901-35.2940) | flat | minaret [il-minaret-32.17597-35.33566]; minaret [il-minaret-32.19011-35.29316]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.19011-35.29316] → minaret [il-minaret-32.19011-35.29316] → minaret [il-minaret-32.19011-35.29316] | minaret [il-minaret-32.17597-35.33566]; minaret [il-minaret-32.19011-35.29316]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.19011-35.29316] → minaret [il-minaret-32.19011-35.29316] → minaret [il-minaret-32.19011-35.29316] |
| שכם (il-32.2205-35.2569) | flat | minaret [il-minaret-32.19011-35.29316]; minaret [il-minaret-32.22066-35.25683] → minaret [il-minaret-32.22066-35.25683] → minaret [il-minaret-32.22066-35.25683] → minaret [il-minaret-32.22066-35.25683] | minaret [il-minaret-32.19011-35.29316]; minaret [il-minaret-32.22066-35.25683] → minaret [il-minaret-32.22066-35.25683] → minaret [il-minaret-32.22066-35.25683] → minaret [il-minaret-32.22066-35.25683] |
| מ.פ. עסכר (אל-קדים) (il-32.2202-35.2978) | flat | minaret [il-minaret-32.19011-35.29316]; minaret [il-minaret-32.20448-35.13156]; minaret [il-minaret-32.22019-35.29637] → minaret [il-minaret-32.22019-35.29637] → minaret [il-minaret-32.22019-35.29637] → minaret [il-minaret-32.22019-35.29637] | minaret [il-minaret-32.19011-35.29316]; minaret [il-minaret-32.20448-35.13156]; minaret [il-minaret-32.22019-35.29637] → minaret [il-minaret-32.22019-35.29637] → minaret [il-minaret-32.22019-35.29637] → minaret [il-minaret-32.22019-35.29637] |
| מ.פ. עסכר (אל- ג'דיד) (il-32.2146-35.3044) | flat | minaret [il-minaret-32.20448-35.13156] → 0 → minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.21102-35.3245] | minaret [il-minaret-32.20448-35.13156] → 0 → minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.21102-35.3245] |
| מסאכין (il-32.2287-35.3022) | flat | minaret [il-minaret-32.20448-35.13156]; minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.22769-35.30278] | minaret [il-minaret-32.20448-35.13156]; minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.21806-35.28996]; minaret [il-minaret-32.22769-35.30278] |
| זאואתא (il-32.2463-35.2269) | flat | minaret [il-minaret-32.22444-35.2467] → 0 → 0 → 0 | minaret [il-minaret-32.22444-35.2467] → 0 → 0 → 0 |
| ג'וניד (il-32.2254-35.2192) | flat | minaret [il-minaret-32.20448-35.13156]; minaret [il-minaret-32.22455-35.22054]; minaret [il-minaret-32.22828-35.22405] → minaret [il-minaret-32.21071-35.19023]; minaret [il-minaret-32.22028-35.23392]; minaret [il-minaret-32.22455-35.22054]; minaret [il-minaret-32.22828-35.22405] → minaret [il-minaret-32.21071-35.19023]; minaret [il-minaret-32.22028-35.23392]; minaret [il-minaret-32.22455-35.22054]; minaret [il-minaret-32.22828-35.22405] → minaret [il-minaret-32.21071-35.19023]; minaret [il-minaret-32.22028-35.23392]; minaret [il-minaret-32.22455-35.22054]; minaret [il-minaret-32.22828-35.22405] | minaret [il-minaret-32.20448-35.13156]; minaret [il-minaret-32.22455-35.22054]; minaret [il-minaret-32.22828-35.22405] → minaret [il-minaret-32.21071-35.19023]; minaret [il-minaret-32.22028-35.23392]; minaret [il-minaret-32.22455-35.22054]; minaret [il-minaret-32.22828-35.22405] → minaret [il-minaret-32.21071-35.19023]; minaret [il-minaret-32.22028-35.23392]; minaret [il-minaret-32.22455-35.22054]; minaret [il-minaret-32.22828-35.22405] → minaret [il-minaret-32.21071-35.19023]; minaret [il-minaret-32.22028-35.23392]; minaret [il-minaret-32.22455-35.22054]; minaret [il-minaret-32.22828-35.22405] |
| בית וזן (il-32.2302-35.2157) | flat | minaret [il-minaret-32.21071-35.19023]; minaret [il-minaret-32.23006-35.25212] → minaret [il-minaret-32.23006-35.25212] → minaret [il-minaret-32.23006-35.25212] → minaret [il-minaret-32.23006-35.25212] | minaret [il-minaret-32.21071-35.19023]; minaret [il-minaret-32.23006-35.25212] → minaret [il-minaret-32.23006-35.25212] → minaret [il-minaret-32.23006-35.25212] → minaret [il-minaret-32.23006-35.25212] |
| בית איבא (il-32.2374-35.2107) | flat | minaret [il-minaret-32.23423-35.20963]; minaret [il-minaret-32.23494-35.2464] → minaret [il-minaret-32.23423-35.20963] → minaret [il-minaret-32.23423-35.20963] → minaret [il-minaret-32.23423-35.20963] | minaret [il-minaret-32.23423-35.20963]; minaret [il-minaret-32.23494-35.2464] → minaret [il-minaret-32.23423-35.20963] → minaret [il-minaret-32.23423-35.20963] → minaret [il-minaret-32.23423-35.20963] |
| הר ברכה (il-32.1924-35.2651) | flat | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 |
| תל (il-32.1989-35.2130) | flat | minaret [il-minaret-32.19915-35.21639]; minaret [il-minaret-32.20057-35.2119]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.19915-35.21639]; minaret [il-minaret-32.20057-35.2119] → minaret [il-minaret-32.19915-35.21639]; minaret [il-minaret-32.20057-35.2119] → minaret [il-minaret-32.19915-35.21639]; minaret [il-minaret-32.20057-35.2119] | minaret [il-minaret-32.19915-35.21639]; minaret [il-minaret-32.20057-35.2119]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.19915-35.21639]; minaret [il-minaret-32.20057-35.2119] → minaret [il-minaret-32.19915-35.21639]; minaret [il-minaret-32.20057-35.2119] → minaret [il-minaret-32.19915-35.21639]; minaret [il-minaret-32.20057-35.2119] |
| עיראק בורין (il-32.2014-35.2413) | flat | minaret [il-minaret-32.20217-35.23828]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.20217-35.23828] → minaret [il-minaret-32.20217-35.23828]; synagogue [il-synagogue-32.1925-35.26473] → minaret [il-minaret-32.20217-35.23828]; synagogue [il-synagogue-32.1925-35.26473] | minaret [il-minaret-32.20217-35.23828]; minaret [il-minaret-32.20448-35.13156] → minaret [il-minaret-32.20217-35.23828]; synagogue [il-synagogue-32.1925-35.26473] → minaret [il-minaret-32.20217-35.23828]; synagogue [il-synagogue-32.1925-35.26473] → minaret [il-minaret-32.20217-35.23828]; synagogue [il-synagogue-32.1925-35.26473] |
| עקרבה (il-32.1270-35.3438) | flat | minaret [il-minaret-32.10152-35.32202]; minaret [il-minaret-32.12718-35.34479] → minaret [il-minaret-32.12718-35.34479] → minaret [il-minaret-32.12718-35.34479] → minaret [il-minaret-32.12718-35.34479] | minaret [il-minaret-32.10152-35.32202]; minaret [il-minaret-32.12718-35.34479] → minaret [il-minaret-32.12718-35.34479] → minaret [il-minaret-32.12718-35.34479] → minaret [il-minaret-32.12718-35.34479] |
| אוסרין (il-32.1251-35.3106) | flat | minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.12429-35.33796]; minaret [il-minaret-32.12506-35.30978] → minaret [il-minaret-32.12506-35.30978] → minaret [il-minaret-32.12506-35.30978]; minaret [il-minaret-32.13829-35.28458] → minaret [il-minaret-32.12506-35.30978] | minaret [il-minaret-32.10057-35.28922]; minaret [il-minaret-32.12429-35.33796]; minaret [il-minaret-32.12506-35.30978] → minaret [il-minaret-32.12506-35.30978] → minaret [il-minaret-32.12506-35.30978]; minaret [il-minaret-32.13829-35.28458] → minaret [il-minaret-32.12506-35.30978] |
| הר ינון (il-32.1534-35.3662) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעה 782 (il-32.1593-35.3309) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חוות אלומות (il-32.1607-35.3342) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעה 851 (il-32.1667-35.3360) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעות עולם (il-32.1611-35.3528) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| הנקודה (il-32.1680-35.3156) | flat | synagogue [il-synagogue-32.17079-35.31484] → minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711]; synagogue [il-synagogue-32.17079-35.31484] → minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711]; synagogue [il-synagogue-32.17079-35.31484] → minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711]; synagogue [il-synagogue-32.17079-35.31484] | synagogue [il-synagogue-32.17079-35.31484] → minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711]; synagogue [il-synagogue-32.17079-35.31484] → minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711]; synagogue [il-synagogue-32.17079-35.31484] → minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711]; synagogue [il-synagogue-32.17079-35.31484] |
| איתמר (il-32.1745-35.3084) | flat | synagogue [il-synagogue-32.17343-35.31002] → minaret [il-minaret-32.16135-35.29311]; synagogue [il-synagogue-32.17343-35.31002] → minaret [il-minaret-32.16135-35.29311]; synagogue [il-synagogue-32.17343-35.31002] → minaret [il-minaret-32.16135-35.29311]; synagogue [il-synagogue-32.17343-35.31002] | synagogue [il-synagogue-32.17343-35.31002] → minaret [il-minaret-32.16135-35.29311]; synagogue [il-synagogue-32.17343-35.31002] → minaret [il-minaret-32.16135-35.29311]; synagogue [il-synagogue-32.17343-35.31002] → minaret [il-minaret-32.16135-35.29311]; synagogue [il-synagogue-32.17343-35.31002] |
| בית פוריכ (il-32.1791-35.3349) | flat | minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711]; minaret [il-minaret-32.17597-35.33566] → minaret [il-minaret-32.17597-35.33566] → minaret [il-minaret-32.17597-35.33566]; minaret [il-minaret-32.19273-35.37086] → minaret [il-minaret-32.17597-35.33566] | minaret [il-minaret-32.16135-35.29311]; minaret [il-minaret-32.16172-35.28711]; minaret [il-minaret-32.17597-35.33566] → minaret [il-minaret-32.17597-35.33566] → minaret [il-minaret-32.17597-35.33566]; minaret [il-minaret-32.19273-35.37086] → minaret [il-minaret-32.17597-35.33566] |
| בית דג'ן (il-32.1919-35.3721) | flat | minaret [il-minaret-32.19273-35.37086] → minaret [il-minaret-32.19273-35.37086] → minaret [il-minaret-32.19273-35.37086] → minaret [il-minaret-32.19273-35.37086] | minaret [il-minaret-32.19273-35.37086] → minaret [il-minaret-32.19273-35.37086] → minaret [il-minaret-32.19273-35.37086] → minaret [il-minaret-32.19273-35.37086] |
| משואה (il-32.1129-35.4920) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-ג'פתליק (il-32.1439-35.4971) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חלת אל-פולה (il-32.1558-35.4699) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מכורה (il-32.1649-35.4230) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל- מספה (il-32.1625-35.4809) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פרוש בית דג'ן (il-32.1847-35.4543) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חמרה (il-32.1995-35.4367) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זובידאת (il-32.1725-35.5300) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ארגמן (il-32.1729-35.5223) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מרג' נעג'ה (il-32.1847-35.5379) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בצרה (il-32.2143-34.8780) | flat | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 | minaret [il-minaret-32.18783-34.80582] → 0 → 0 → 0 |
| בני ציון (il-32.2204-34.8687) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חרוצים (il-32.2275-34.8641) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ארסוף (il-32.2141-34.8168) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שפיים (il-32.2169-34.8248) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| געש (il-32.2289-34.8235) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יקום (il-32.2486-34.8421) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תל יצחק (il-32.2560-34.8693) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית יהושע (il-32.2593-34.8660) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבן יהודה (il-32.2725-34.8868) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אודים (il-32.2648-34.8469) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| הדסים (il-32.2862-34.8851) | flat | synagogue [il-synagogue-32.2754-34.84891] → 0 → 0 → 0 | synagogue [il-synagogue-32.2754-34.84891] → 0 → 0 → 0 |
| בני דרור (il-32.2619-34.9002) | flat | synagogue [il-synagogue-32.26086-34.9004] → synagogue [il-synagogue-32.26086-34.9004] → synagogue [il-synagogue-32.26086-34.9004] → synagogue [il-synagogue-32.26086-34.9004] | synagogue [il-synagogue-32.26086-34.9004] → synagogue [il-synagogue-32.26086-34.9004] → synagogue [il-synagogue-32.26086-34.9004] → synagogue [il-synagogue-32.26086-34.9004] |
| נורדיה (il-32.3148-34.8962) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גנות הדר (il-32.3195-34.9001) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פרדסיה (il-32.3070-34.9098) | flat | synagogue [il-synagogue-32.30802-34.90958] → synagogue [il-synagogue-32.30802-34.90958] → synagogue [il-synagogue-32.30802-34.90958] → synagogue [il-synagogue-32.30802-34.90958] | synagogue [il-synagogue-32.30802-34.90958] → synagogue [il-synagogue-32.30802-34.90958] → synagogue [il-synagogue-32.30802-34.90958] → synagogue [il-synagogue-32.30802-34.90958] |
| גבעת שפירא (il-32.3579-34.8763) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בת חן (il-32.3603-34.8723) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צור משה (il-32.2978-34.9136) | flat | synagogue [il-synagogue-32.30271-34.91491] → synagogue [il-synagogue-32.30271-34.91491] → synagogue [il-synagogue-32.30271-34.91491] → synagogue [il-synagogue-32.30271-34.91491] | synagogue [il-synagogue-32.30271-34.91491] → synagogue [il-synagogue-32.30271-34.91491] → synagogue [il-synagogue-32.30271-34.91491] → synagogue [il-synagogue-32.30271-34.91491] |
| קדימה (il-32.2764-34.9125) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אייל (il-32.2114-34.9790) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כוכב יאיר צור יגאל (il-32.2202-34.9939) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמת הכובש (il-32.2153-34.9393) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משמרת (il-32.2280-34.9220) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טירה (il-32.2347-34.9545) | flat | minaret [il-minaret-32.23481-34.9517] → minaret [il-minaret-32.23481-34.9517] → minaret [il-minaret-32.23481-34.9517] → minaret [il-minaret-32.23481-34.9517] | minaret [il-minaret-32.23481-34.9517] → minaret [il-minaret-32.23481-34.9517] → minaret [il-minaret-32.23481-34.9517] → minaret [il-minaret-32.23481-34.9517] |
| חרות (il-32.2403-34.9150) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תל מונד (il-32.2537-34.9185) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין ורד (il-32.2653-34.9318) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר הס (il-32.2458-34.9340) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין שריד (il-32.2741-34.9354) | flat | 0 → 0 → synagogue [il-synagogue-32.27124-34.91288] → 0 | 0 → 0 → synagogue [il-synagogue-32.27124-34.91288] → 0 |
| כפר עבודה (il-32.2570-34.9421) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צור יצחק (il-32.2412-34.9984) | flat | minaret [il-minaret-32.2518-35.00824] → minaret [il-minaret-32.2518-35.00824] → minaret [il-minaret-32.2518-35.00824] → minaret [il-minaret-32.2518-35.00824] | minaret [il-minaret-32.2518-35.00824] → minaret [il-minaret-32.2518-35.00824] → minaret [il-minaret-32.2518-35.00824] → minaret [il-minaret-32.2518-35.00824] |
| טייבה (il-32.2671-35.0089) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עזריאל (il-32.2629-34.9712) | flat | synagogue [il-synagogue-32.26287-34.97119] → synagogue [il-synagogue-32.26287-34.97119] → synagogue [il-synagogue-32.26287-34.97119] → synagogue [il-synagogue-32.26287-34.97119] | synagogue [il-synagogue-32.26287-34.97119] → synagogue [il-synagogue-32.26287-34.97119] → synagogue [il-synagogue-32.26287-34.97119] → synagogue [il-synagogue-32.26287-34.97119] |
| יעף (il-32.2683-34.9659) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר יעבץ (il-32.2738-34.9669) | flat | synagogue [il-synagogue-32.27415-34.96557] → synagogue [il-synagogue-32.27415-34.96557] → synagogue [il-synagogue-32.27415-34.96557] → synagogue [il-synagogue-32.27415-34.96557] | synagogue [il-synagogue-32.27415-34.96557] → synagogue [il-synagogue-32.27415-34.96557] → synagogue [il-synagogue-32.27415-34.96557] → synagogue [il-synagogue-32.27415-34.96557] |
| קלנסווה (il-32.2849-34.9802) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תנובות (il-32.3052-34.9621) | flat | minaret [il-minaret-32.28398-34.98196]; minaret [il-minaret-32.28595-34.96568] → 0 → 0 → 0 | minaret [il-minaret-32.28398-34.98196]; minaret [il-minaret-32.28595-34.96568] → 0 → 0 → 0 |
| שער אפרים (il-32.2890-34.9974) | flat | minaret [il-minaret-32.27919-34.97782] → 0 → 0 → 0 | minaret [il-minaret-32.27919-34.97782] → 0 → 0 → 0 |
| פורת (il-32.2763-34.9495) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צורן (il-32.2881-34.9451) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גאולים (il-32.2963-34.9474) | flat | 0 → minaret [il-minaret-32.28595-34.96568] → minaret [il-minaret-32.28595-34.96568] → minaret [il-minaret-32.28595-34.96568] | 0 → minaret [il-minaret-32.28595-34.96568] → minaret [il-minaret-32.28595-34.96568] → minaret [il-minaret-32.28595-34.96568] |
| כפר זיבאד (il-32.2231-35.0712) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר עבוש (il-32.2222-35.0851) | flat | minaret [il-minaret-32.22432-35.0856] → minaret [il-minaret-32.22432-35.0856] → minaret [il-minaret-32.22432-35.0856] → minaret [il-minaret-32.22432-35.0856] | minaret [il-minaret-32.22432-35.0856] → minaret [il-minaret-32.22432-35.0856] → minaret [il-minaret-32.22432-35.0856] → minaret [il-minaret-32.22432-35.0856] |
| פלאמיה (il-32.2253-35.0231) | flat | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 |
| צור נתן (il-32.2407-35.0139) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סלעית (il-32.2428-35.0508) | flat | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 |
| אל-ראס (il-32.2514-35.0636) | flat | minaret [il-minaret-32.25126-35.06126]; minaret [il-minaret-32.25357-35.06369] → minaret [il-minaret-32.25126-35.06126]; minaret [il-minaret-32.25357-35.06369] → minaret [il-minaret-32.25126-35.06126]; minaret [il-minaret-32.25357-35.06369] → minaret [il-minaret-32.25126-35.06126]; minaret [il-minaret-32.25357-35.06369] | minaret [il-minaret-32.25126-35.06126]; minaret [il-minaret-32.25357-35.06369] → minaret [il-minaret-32.25126-35.06126]; minaret [il-minaret-32.25357-35.06369] → minaret [il-minaret-32.25126-35.06126]; minaret [il-minaret-32.25357-35.06369] → minaret [il-minaret-32.25126-35.06126]; minaret [il-minaret-32.25357-35.06369] |
| ח'רבת ג'בארה (il-32.2690-35.0419) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שופה (il-32.2747-35.0837) | flat | minaret [il-minaret-32.2746-35.08348] → minaret [il-minaret-32.2746-35.08348] → minaret [il-minaret-32.2746-35.08348] → minaret [il-minaret-32.2746-35.08348] | minaret [il-minaret-32.2746-35.08348] → minaret [il-minaret-32.2746-35.08348] → minaret [il-minaret-32.2746-35.08348] → minaret [il-minaret-32.2746-35.08348] |
| עזבת שופה (il-32.2816-35.0478) | flat | minaret [il-minaret-32.28269-35.05035] → minaret [il-minaret-32.28269-35.05035] → minaret [il-minaret-32.28269-35.05035] → minaret [il-minaret-32.28269-35.05035] | minaret [il-minaret-32.28269-35.05035] → minaret [il-minaret-32.28269-35.05035] → minaret [il-minaret-32.28269-35.05035] → minaret [il-minaret-32.28269-35.05035] |
| אבני חפץ (il-32.2848-35.0735) | flat | minaret [il-minaret-32.29534-35.04118]; synagogue [il-synagogue-32.28982-35.07189] → synagogue [il-synagogue-32.28982-35.07189] → minaret [il-minaret-32.29534-35.04118]; synagogue [il-synagogue-32.28982-35.07189] → synagogue [il-synagogue-32.28982-35.07189] | minaret [il-minaret-32.29534-35.04118]; synagogue [il-synagogue-32.28982-35.07189] → synagogue [il-synagogue-32.28982-35.07189] → minaret [il-minaret-32.29534-35.04118]; synagogue [il-synagogue-32.28982-35.07189] → synagogue [il-synagogue-32.28982-35.07189] |
| פרעון (il-32.2860-35.0234) | flat | minaret [il-minaret-32.28538-35.02064] → minaret [il-minaret-32.28538-35.02064] → minaret [il-minaret-32.28538-35.02064] → minaret [il-minaret-32.28538-35.02064] | minaret [il-minaret-32.28538-35.02064] → minaret [il-minaret-32.28538-35.02064] → minaret [il-minaret-32.28538-35.02064] → minaret [il-minaret-32.28538-35.02064] |
| טולכרם (il-32.3111-35.0275) | flat | minaret [il-minaret-32.31065-35.02915] → minaret [il-minaret-32.31065-35.02915] → minaret [il-minaret-32.31065-35.02915] → minaret [il-minaret-32.31065-35.02915] | minaret [il-minaret-32.31065-35.02915] → minaret [il-minaret-32.31065-35.02915] → minaret [il-minaret-32.31065-35.02915] → minaret [il-minaret-32.31065-35.02915] |
| ד'ינבה (il-32.3134-35.0444) | flat | minaret [il-minaret-32.31399-35.04487] → minaret [il-minaret-32.31399-35.04487] → minaret [il-minaret-32.31399-35.04487] → minaret [il-minaret-32.31399-35.04487] | minaret [il-minaret-32.31399-35.04487] → minaret [il-minaret-32.31399-35.04487] → minaret [il-minaret-32.31399-35.04487] → minaret [il-minaret-32.31399-35.04487] |
| איכתאבא (il-32.3237-35.0473) | flat | minaret [il-minaret-32.32354-35.04349] → minaret [il-minaret-32.32354-35.04349] → minaret [il-minaret-32.32354-35.04349] → minaret [il-minaret-32.32354-35.04349] | minaret [il-minaret-32.32354-35.04349] → minaret [il-minaret-32.32354-35.04349] → minaret [il-minaret-32.32354-35.04349] → minaret [il-minaret-32.32354-35.04349] |
| מ.פ. נור שמס (il-32.3180-35.0598) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כתאבא (il-32.3264-35.0534) | flat | minaret [il-minaret-32.32574-35.05286] → minaret [il-minaret-32.32574-35.05286] → minaret [il-minaret-32.32574-35.05286] → minaret [il-minaret-32.32574-35.05286] | minaret [il-minaret-32.32574-35.05286] → minaret [il-minaret-32.32574-35.05286] → minaret [il-minaret-32.32574-35.05286] → minaret [il-minaret-32.32574-35.05286] |
| שוויקה (il-32.3357-35.0358) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מצפה ישי (il-32.2066-35.1589) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קדומים דרום (il-32.2122-35.1613) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אשקוביות קרוונים (il-32.2133-35.1545) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כרמי קדם (il-32.2174-35.1557) | flat | minaret [il-minaret-32.17931-35.13054] → 0 → 0 → 0 | minaret [il-minaret-32.17931-35.13054] → 0 → 0 → 0 |
| גבעת רש"י (il-32.2193-35.1621) | flat | synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] | synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] |
| מצפה קדומים (il-32.2207-35.1595) | flat | synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] | synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] → synagogue [il-synagogue-32.21904-35.16293] |
| גת קדומים (il-32.2305-35.1641) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קדומים מזרח (il-32.2058-35.1655) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סרה (il-32.2096-35.1902) | flat | minaret [il-minaret-32.21071-35.19023] → minaret [il-minaret-32.21071-35.19023] → minaret [il-minaret-32.21071-35.19023] → minaret [il-minaret-32.21071-35.19023] | minaret [il-minaret-32.21071-35.19023] → minaret [il-minaret-32.21071-35.19023] → minaret [il-minaret-32.21071-35.19023] → minaret [il-minaret-32.21071-35.19023] |
| הר חמד (il-32.2303-35.1519) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קוסין (il-32.2378-35.1865) | flat | minaret [il-minaret-32.22028-35.23392]; minaret [il-minaret-32.23851-35.1825] → minaret [il-minaret-32.23851-35.1825] → minaret [il-minaret-32.23851-35.1825] → minaret [il-minaret-32.23851-35.1825] | minaret [il-minaret-32.22028-35.23392]; minaret [il-minaret-32.23851-35.1825] → minaret [il-minaret-32.23851-35.1825] → minaret [il-minaret-32.23851-35.1825] → minaret [il-minaret-32.23851-35.1825] |
| דיר שרף (il-32.2541-35.1891) | flat | minaret [il-minaret-32.25301-35.19022] → minaret [il-minaret-32.25301-35.19022] → minaret [il-minaret-32.25301-35.19022] → minaret [il-minaret-32.25301-35.19022] | minaret [il-minaret-32.25301-35.19022] → minaret [il-minaret-32.25301-35.19022] → minaret [il-minaret-32.25301-35.19022] → minaret [il-minaret-32.25301-35.19022] |
| אל-נאקורה (il-32.2654-35.2003) | flat | minaret [il-minaret-32.26607-35.20086] → minaret [il-minaret-32.26607-35.20086] → minaret [il-minaret-32.26607-35.20086]; minaret [il-minaret-32.27416-35.21567] → minaret [il-minaret-32.26607-35.20086] | minaret [il-minaret-32.26607-35.20086] → minaret [il-minaret-32.26607-35.20086] → minaret [il-minaret-32.26607-35.20086]; minaret [il-minaret-32.27416-35.21567] → minaret [il-minaret-32.26607-35.20086] |
| שבי שומרון (il-32.2632-35.1848) | flat | synagogue [il-synagogue-32.26292-35.18577] → synagogue [il-synagogue-32.26292-35.18577] → synagogue [il-synagogue-32.26292-35.18577] → synagogue [il-synagogue-32.26292-35.18577] | synagogue [il-synagogue-32.26292-35.18577] → synagogue [il-synagogue-32.26292-35.18577] → synagogue [il-synagogue-32.26292-35.18577] → synagogue [il-synagogue-32.26292-35.18577] |
| עינב (il-32.2846-35.1264) | flat | minaret [il-minaret-32.28523-35.14879]; synagogue [il-synagogue-32.28443-35.12666] → synagogue [il-synagogue-32.28443-35.12666] → synagogue [il-synagogue-32.28443-35.12666] → synagogue [il-synagogue-32.28443-35.12666] | minaret [il-minaret-32.28523-35.14879]; synagogue [il-synagogue-32.28443-35.12666] → synagogue [il-synagogue-32.28443-35.12666] → synagogue [il-synagogue-32.28443-35.12666] → synagogue [il-synagogue-32.28443-35.12666] |
| ראמין (il-32.2857-35.1499) | flat | minaret [il-minaret-32.28523-35.14879] → minaret [il-minaret-32.28523-35.14879] → minaret [il-minaret-32.28523-35.14879] → minaret [il-minaret-32.28523-35.14879] | minaret [il-minaret-32.28523-35.14879] → minaret [il-minaret-32.28523-35.14879] → minaret [il-minaret-32.28523-35.14879] → minaret [il-minaret-32.28523-35.14879] |
| כפר אל-לבד (il-32.2961-35.1075) | flat | minaret [il-minaret-32.29683-35.10909] → minaret [il-minaret-32.29683-35.10909] → minaret [il-minaret-32.29683-35.10909] → minaret [il-minaret-32.29683-35.10909] | minaret [il-minaret-32.29683-35.10909] → minaret [il-minaret-32.29683-35.10909] → minaret [il-minaret-32.29683-35.10909] → minaret [il-minaret-32.29683-35.10909] |
| בורקה (il-32.3012-35.1943) | flat | minaret [il-minaret-32.30034-35.19375]; minaret [il-minaret-32.3017-35.18784] → minaret [il-minaret-32.30034-35.19375]; minaret [il-minaret-32.3017-35.18784] → minaret [il-minaret-32.30034-35.19375]; minaret [il-minaret-32.3017-35.18784] → minaret [il-minaret-32.30034-35.19375]; minaret [il-minaret-32.3017-35.18784] | minaret [il-minaret-32.30034-35.19375]; minaret [il-minaret-32.3017-35.18784] → minaret [il-minaret-32.30034-35.19375]; minaret [il-minaret-32.3017-35.18784] → minaret [il-minaret-32.30034-35.19375]; minaret [il-minaret-32.3017-35.18784] → minaret [il-minaret-32.30034-35.19375]; minaret [il-minaret-32.3017-35.18784] |
| ענבתא (il-32.3073-35.1161) | flat | minaret [il-minaret-32.3067-35.11442]; minaret [il-minaret-32.30929-35.11984] → minaret [il-minaret-32.3067-35.11442]; minaret [il-minaret-32.30929-35.11984] → minaret [il-minaret-32.3067-35.11442]; minaret [il-minaret-32.30929-35.11984] → minaret [il-minaret-32.3067-35.11442]; minaret [il-minaret-32.30929-35.11984] | minaret [il-minaret-32.3067-35.11442]; minaret [il-minaret-32.30929-35.11984] → minaret [il-minaret-32.3067-35.11442]; minaret [il-minaret-32.30929-35.11984] → minaret [il-minaret-32.3067-35.11442]; minaret [il-minaret-32.30929-35.11984] → minaret [il-minaret-32.3067-35.11442]; minaret [il-minaret-32.30929-35.11984] |
| קריית לוזה (il-32.2041-35.2687) | flat | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 | minaret [il-minaret-32.20448-35.13156] → 0 → 0 → 0 |
| עסירה א-שמאליה (il-32.2515-35.2674) | flat | minaret [il-minaret-32.24915-35.26688] → minaret [il-minaret-32.24915-35.26688] → minaret [il-minaret-32.24915-35.26688] → minaret [il-minaret-32.24915-35.26688] | minaret [il-minaret-32.24915-35.26688] → minaret [il-minaret-32.24915-35.26688] → minaret [il-minaret-32.24915-35.26688] → minaret [il-minaret-32.24915-35.26688] |
| טלוזה (il-32.2707-35.2949) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| איג'ניסיניא (il-32.2729-35.2166) | flat | minaret [il-minaret-32.27416-35.21567] → minaret [il-minaret-32.26607-35.20086]; minaret [il-minaret-32.27416-35.21567] → minaret [il-minaret-32.26607-35.20086]; minaret [il-minaret-32.27416-35.21567] → minaret [il-minaret-32.27416-35.21567] | minaret [il-minaret-32.27416-35.21567] → minaret [il-minaret-32.26607-35.20086]; minaret [il-minaret-32.27416-35.21567] → minaret [il-minaret-32.26607-35.20086]; minaret [il-minaret-32.27416-35.21567] → minaret [il-minaret-32.26607-35.20086]; minaret [il-minaret-32.27416-35.21567] |
| נסף ג'ביל (il-32.2833-35.2201) | flat | minaret [il-minaret-32.26607-35.20086]; minaret [il-minaret-32.27416-35.21567] → 0 → minaret [il-minaret-32.29694-35.19441] → 0 | minaret [il-minaret-32.26607-35.20086]; minaret [il-minaret-32.27416-35.21567] → 0 → minaret [il-minaret-32.29694-35.19441] → 0 |
| בית אימרין (il-32.2921-35.2157) | flat | minaret [il-minaret-32.29221-35.2158]; minaret [il-minaret-32.29694-35.19441] → minaret [il-minaret-32.29221-35.2158] → minaret [il-minaret-32.29221-35.2158] → minaret [il-minaret-32.29221-35.2158] | minaret [il-minaret-32.29221-35.2158]; minaret [il-minaret-32.29694-35.19441] → minaret [il-minaret-32.29221-35.2158] → minaret [il-minaret-32.29221-35.2158] → minaret [il-minaret-32.29221-35.2158] |
| יאסיד (il-32.2965-35.2782) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סאלם (il-32.2091-35.3331) | flat | minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245] | minaret [il-minaret-32.17597-35.33566]; minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245] |
| דיר אל-חטב (il-32.2171-35.3219) | flat | minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245]; minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.21102-35.3245]; minaret [il-minaret-32.21806-35.28996]; minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.21102-35.3245]; minaret [il-minaret-32.21806-35.28996] | minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245]; minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.21102-35.3245] → minaret [il-minaret-32.21102-35.3245]; minaret [il-minaret-32.21806-35.28996]; minaret [il-minaret-32.22769-35.30278] → minaret [il-minaret-32.21102-35.3245]; minaret [il-minaret-32.21806-35.28996] |
| חוות סקאלי (il-32.2143-35.3706) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עזמוט (il-32.2226-35.3100) | flat | minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245]; minaret [il-minaret-32.22356-35.31012] → minaret [il-minaret-32.22356-35.31012] → minaret [il-minaret-32.22356-35.31012] → minaret [il-minaret-32.22356-35.31012] | minaret [il-minaret-32.20947-35.33192]; minaret [il-minaret-32.21102-35.3245]; minaret [il-minaret-32.22356-35.31012] → minaret [il-minaret-32.22356-35.31012] → minaret [il-minaret-32.22356-35.31012] → minaret [il-minaret-32.22356-35.31012] |
| אלון מורה (il-32.2357-35.3316) | flat | minaret [il-minaret-32.22769-35.30278]; synagogue [il-synagogue-32.23476-35.33223] → minaret [il-minaret-32.22769-35.30278]; synagogue [il-synagogue-32.23476-35.33223] → minaret [il-minaret-32.22769-35.30278]; synagogue [il-synagogue-32.23476-35.33223] → minaret [il-minaret-32.22769-35.30278]; synagogue [il-synagogue-32.23476-35.33223] | minaret [il-minaret-32.22769-35.30278]; synagogue [il-synagogue-32.23476-35.33223] → minaret [il-minaret-32.22769-35.30278]; synagogue [il-synagogue-32.23476-35.33223] → minaret [il-minaret-32.22769-35.30278]; synagogue [il-synagogue-32.23476-35.33223] → minaret [il-minaret-32.22769-35.30278]; synagogue [il-synagogue-32.23476-35.33223] |
| בית חסאן (il-32.2391-35.4040) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בקעות (il-32.2428-35.4537) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-חדידייה (il-32.2426-35.5006) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רועי (il-32.2476-35.4885) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חמדת (il-32.2514-35.5263) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חוות נוף גלעד (il-32.2896-35.5193) | flat | synagogue [il-synagogue-32.28961-35.51991] → synagogue [il-synagogue-32.28961-35.51991] → synagogue [il-synagogue-32.28961-35.51991] → synagogue [il-synagogue-32.28961-35.51991] | synagogue [il-synagogue-32.28961-35.51991] → synagogue [il-synagogue-32.28961-35.51991] → synagogue [il-synagogue-32.28961-35.51991] → synagogue [il-synagogue-32.28961-35.51991] |
| כפר ידידיה (il-32.3449-34.9000) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| הדר עם (il-32.3491-34.9006) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר מונש (il-32.3475-34.9162) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| צוקי ים (il-32.3614-34.8587) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית ינאי (il-32.3775-34.8630) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר ויתקין (il-32.3809-34.8752) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית חרות (il-32.3758-34.8741) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מכמורת (il-32.4063-34.8729) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ינוב (il-32.3061-34.9505) | flat | minaret [il-minaret-32.28398-34.98196]; minaret [il-minaret-32.28595-34.96568] → 0 → 0 → 0 | minaret [il-minaret-32.28398-34.98196]; minaret [il-minaret-32.28595-34.96568] → 0 → 0 → 0 |
| כפר יונה (il-32.3145-34.9321) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניצני עוז (il-32.3055-35.0049) | flat | 0 → minaret [il-minaret-32.30453-35.03117] → minaret [il-minaret-32.30453-35.03117] → minaret [il-minaret-32.30453-35.03117] | 0 → minaret [il-minaret-32.30453-35.03117] → minaret [il-minaret-32.30453-35.03117] → minaret [il-minaret-32.30453-35.03117] |
| בארותיים (il-32.3219-34.9829) | flat | minaret [il-minaret-32.28595-34.96568] → 0 → 0 → 0 | minaret [il-minaret-32.28595-34.96568] → 0 → 0 → 0 |
| עולש (il-32.3317-34.9862) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בורגתה (il-32.3265-34.9629) | flat | minaret [il-minaret-32.28595-34.96568] → 0 → 0 → 0 | minaret [il-minaret-32.28595-34.96568] → 0 → 0 → 0 |
| חניאל (il-32.3321-34.9486) | flat | synagogue [il-synagogue-32.33297-34.95037] → synagogue [il-synagogue-32.33297-34.95037] → synagogue [il-synagogue-32.33297-34.95037] → synagogue [il-synagogue-32.33297-34.95037] | synagogue [il-synagogue-32.33297-34.95037] → synagogue [il-synagogue-32.33297-34.95037] → synagogue [il-synagogue-32.33297-34.95037] → synagogue [il-synagogue-32.33297-34.95037] |
| גן יאשיה (il-32.3507-34.9954) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעברות (il-32.3640-34.9047) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| העוגן (il-32.3619-34.9232) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אומץ (il-32.3715-34.9962) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר הרא״ה (il-32.3897-34.9119) | flat | synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] | synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] |
| חרב לאת (il-32.4013-34.9171) | flat | synagogue [il-synagogue-32.4021-34.91588] → synagogue [il-synagogue-32.4021-34.91588] → synagogue [il-synagogue-32.4021-34.91588] → synagogue [il-synagogue-32.4021-34.91588] | synagogue [il-synagogue-32.4021-34.91588] → synagogue [il-synagogue-32.4021-34.91588] → synagogue [il-synagogue-32.4021-34.91588] → synagogue [il-synagogue-32.4021-34.91588] |
| אליכין (il-32.4079-34.9249) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין החורש (il-32.3863-34.9400) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת חיים (מאוחד) (il-32.3918-34.9319) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חגלה (il-32.3875-34.9257) | flat | 0 → 0 → synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] | 0 → 0 → synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] |
| גבעת חיים (איחוד) (il-32.4003-34.9331) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אחיטוב (il-32.3873-34.9914) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר אבו עיסא (il-32.3951-34.9022) | flat | 0 → synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] → 0 | 0 → synagogue [il-synagogue-32.38809-34.91196] → synagogue [il-synagogue-32.38809-34.91196] → 0 |
| יד חנה (il-32.3255-35.0061) | flat | minaret [il-minaret-32.30453-35.03117]; synagogue [il-synagogue-32.32561-35.00681] → synagogue [il-synagogue-32.32561-35.00681] → synagogue [il-synagogue-32.32561-35.00681] → synagogue [il-synagogue-32.32561-35.00681] | minaret [il-minaret-32.30453-35.03117]; synagogue [il-synagogue-32.32561-35.00681] → synagogue [il-synagogue-32.32561-35.00681] → synagogue [il-synagogue-32.32561-35.00681] → synagogue [il-synagogue-32.32561-35.00681] |
| בת חפר (il-32.3345-35.0123) | flat | minaret [il-minaret-32.32059-35.03273]; synagogue [il-synagogue-32.33485-35.01054] → synagogue [il-synagogue-32.33485-35.01054] → synagogue [il-synagogue-32.33485-35.01054] → synagogue [il-synagogue-32.33485-35.01054] | minaret [il-minaret-32.32059-35.03273]; synagogue [il-synagogue-32.33485-35.01054] → synagogue [il-synagogue-32.33485-35.01054] → synagogue [il-synagogue-32.33485-35.01054] → synagogue [il-synagogue-32.33485-35.01054] |
| אל מסקופה (il-32.3369-35.0587) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-ג'ארושיה (il-32.3477-35.0500) | flat | minaret [il-minaret-32.34703-35.0496] → minaret [il-minaret-32.34703-35.0496] → minaret [il-minaret-32.34703-35.0496] → minaret [il-minaret-32.34703-35.0496] | minaret [il-minaret-32.34703-35.0496] → minaret [il-minaret-32.34703-35.0496] → minaret [il-minaret-32.34703-35.0496] → minaret [il-minaret-32.34703-35.0496] |
| בחן (il-32.3510-35.0191) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ימה (il-32.3684-35.0303) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| איבתאן (il-32.3656-35.0472) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עתיל (il-32.3697-35.0718) | flat | minaret [il-minaret-32.36943-35.07224]; minaret [il-minaret-32.3739-35.06733] → minaret [il-minaret-32.36943-35.07224]; minaret [il-minaret-32.3739-35.06733] → minaret [il-minaret-32.36943-35.07224]; minaret [il-minaret-32.3739-35.06733] → minaret [il-minaret-32.36943-35.07224]; minaret [il-minaret-32.3739-35.06733] | minaret [il-minaret-32.36943-35.07224]; minaret [il-minaret-32.3739-35.06733] → minaret [il-minaret-32.36943-35.07224]; minaret [il-minaret-32.3739-35.06733] → minaret [il-minaret-32.36943-35.07224]; minaret [il-minaret-32.3739-35.06733] → minaret [il-minaret-32.36943-35.07224]; minaret [il-minaret-32.3739-35.06733] |
| מגל (il-32.3852-35.0352) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג’ת (il-32.3988-35.0375) | flat | minaret [il-minaret-32.39391-35.04261] → minaret [il-minaret-32.39391-35.04261] → minaret [il-minaret-32.39391-35.04261] → minaret [il-minaret-32.39391-35.04261] | minaret [il-minaret-32.39391-35.04261] → minaret [il-minaret-32.39391-35.04261] → minaret [il-minaret-32.39391-35.04261] → minaret [il-minaret-32.39391-35.04261] |
| זיתא (il-32.3853-35.0499) | flat | minaret [il-minaret-32.38528-35.05143] → minaret [il-minaret-32.38528-35.05143] → minaret [il-minaret-32.38528-35.05143] → minaret [il-minaret-32.38528-35.05143] | minaret [il-minaret-32.38528-35.05143] → minaret [il-minaret-32.38528-35.05143] → minaret [il-minaret-32.38528-35.05143] → minaret [il-minaret-32.38528-35.05143] |
| להבות חביבה (il-32.3944-35.0095) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סילת א-ד'הר (il-32.3197-35.1852) | flat | minaret [il-minaret-32.29694-35.19441]; minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.31902-35.19953]; minaret [il-minaret-32.32046-35.18485]; minaret [il-minaret-32.3216-35.19149] → minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.32046-35.18485]; minaret [il-minaret-32.3216-35.19149] → minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.32046-35.18485]; minaret [il-minaret-32.3216-35.19149] → minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.32046-35.18485]; minaret [il-minaret-32.3216-35.19149] | minaret [il-minaret-32.29694-35.19441]; minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.31902-35.19953]; minaret [il-minaret-32.32046-35.18485]; minaret [il-minaret-32.3216-35.19149] → minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.32046-35.18485]; minaret [il-minaret-32.3216-35.19149] → minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.32046-35.18485]; minaret [il-minaret-32.3216-35.19149] → minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.32046-35.18485]; minaret [il-minaret-32.3216-35.19149] |
| פנדקומיה (il-32.3202-35.2039) | flat | minaret [il-minaret-32.31708-35.18514]; minaret [il-minaret-32.32062-35.20364]; minaret [il-minaret-32.32417-35.22166] → minaret [il-minaret-32.32062-35.20364] → minaret [il-minaret-32.32062-35.20364] → minaret [il-minaret-32.32062-35.20364] | minaret [il-minaret-32.31708-35.18514]; minaret [il-minaret-32.32062-35.20364]; minaret [il-minaret-32.32417-35.22166] → minaret [il-minaret-32.32062-35.20364] → minaret [il-minaret-32.32062-35.20364] → minaret [il-minaret-32.32062-35.20364] |
| אלעטארה (il-32.3262-35.1618) | flat | minaret [il-minaret-32.32692-35.16201] → minaret [il-minaret-32.32692-35.16201] → minaret [il-minaret-32.32692-35.16201] → minaret [il-minaret-32.32692-35.16201] | minaret [il-minaret-32.32692-35.16201] → minaret [il-minaret-32.32692-35.16201] → minaret [il-minaret-32.32692-35.16201] → minaret [il-minaret-32.32692-35.16201] |
| אל רמה (il-32.3561-35.1709) | flat | minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.32692-35.16201]; minaret [il-minaret-32.35401-35.1709] → minaret [il-minaret-32.35401-35.1709] → minaret [il-minaret-32.35401-35.1709] → minaret [il-minaret-32.35401-35.1709] | minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.32692-35.16201]; minaret [il-minaret-32.35401-35.1709] → minaret [il-minaret-32.35401-35.1709] → minaret [il-minaret-32.35401-35.1709] → minaret [il-minaret-32.35401-35.1709] |
| עג'ה (il-32.3615-35.1956) | flat | minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.31902-35.19953]; minaret [il-minaret-32.36062-35.19461] → minaret [il-minaret-32.36062-35.19461] → minaret [il-minaret-32.36062-35.19461] → minaret [il-minaret-32.36062-35.19461] | minaret [il-minaret-32.31822-35.18808]; minaret [il-minaret-32.31902-35.19953]; minaret [il-minaret-32.36062-35.19461] → minaret [il-minaret-32.36062-35.19461] → minaret [il-minaret-32.36062-35.19461] → minaret [il-minaret-32.36062-35.19461] |
| כפר ראעי (il-32.3746-35.1553) | flat | minaret [il-minaret-32.37226-35.15645]; minaret [il-minaret-32.37296-35.15281] → minaret [il-minaret-32.37226-35.15645]; minaret [il-minaret-32.37296-35.15281] → minaret [il-minaret-32.37226-35.15645]; minaret [il-minaret-32.37296-35.15281] → minaret [il-minaret-32.37226-35.15645]; minaret [il-minaret-32.37296-35.15281] | minaret [il-minaret-32.37226-35.15645]; minaret [il-minaret-32.37296-35.15281] → minaret [il-minaret-32.37226-35.15645]; minaret [il-minaret-32.37296-35.15281] → minaret [il-minaret-32.37226-35.15645]; minaret [il-minaret-32.37296-35.15281] → minaret [il-minaret-32.37226-35.15645]; minaret [il-minaret-32.37296-35.15281] |
| סיידא (il-32.3850-35.1193) | flat | minaret [il-minaret-32.38539-35.11956] → minaret [il-minaret-32.38539-35.11956] → minaret [il-minaret-32.38539-35.11956] → minaret [il-minaret-32.38539-35.11956] | minaret [il-minaret-32.38539-35.11956] → minaret [il-minaret-32.38539-35.11956] → minaret [il-minaret-32.38539-35.11956] → minaret [il-minaret-32.38539-35.11956] |
| פחמה (il-32.3827-35.1798) | flat | minaret [il-minaret-32.38345-35.18039] → minaret [il-minaret-32.38345-35.18039] → minaret [il-minaret-32.38345-35.18039] → minaret [il-minaret-32.38345-35.18039] | minaret [il-minaret-32.38345-35.18039] → minaret [il-minaret-32.38345-35.18039] → minaret [il-minaret-32.38345-35.18039] → minaret [il-minaret-32.38345-35.18039] |
| ג'בע (il-32.3238-35.2216) | flat | minaret [il-minaret-32.29694-35.19441]; minaret [il-minaret-32.31708-35.18514]; minaret [il-minaret-32.32417-35.22166] → minaret [il-minaret-32.32417-35.22166] → minaret [il-minaret-32.32417-35.22166] → minaret [il-minaret-32.32417-35.22166] | minaret [il-minaret-32.29694-35.19441]; minaret [il-minaret-32.31708-35.18514]; minaret [il-minaret-32.32417-35.22166] → minaret [il-minaret-32.32417-35.22166] → minaret [il-minaret-32.32417-35.22166] → minaret [il-minaret-32.32417-35.22166] |
| סיריס (il-32.3280-35.2910) | flat | minaret [il-minaret-32.32553-35.29317]; minaret [il-minaret-32.32744-35.29034]; minaret [il-minaret-32.33105-35.2965] → minaret [il-minaret-32.32553-35.29317]; minaret [il-minaret-32.32744-35.29034]; minaret [il-minaret-32.33105-35.2965] → minaret [il-minaret-32.32553-35.29317]; minaret [il-minaret-32.32744-35.29034]; minaret [il-minaret-32.33105-35.2965] → minaret [il-minaret-32.32553-35.29317]; minaret [il-minaret-32.32744-35.29034]; minaret [il-minaret-32.33105-35.2965] | minaret [il-minaret-32.32553-35.29317]; minaret [il-minaret-32.32744-35.29034]; minaret [il-minaret-32.33105-35.2965] → minaret [il-minaret-32.32553-35.29317]; minaret [il-minaret-32.32744-35.29034]; minaret [il-minaret-32.33105-35.2965] → minaret [il-minaret-32.32553-35.29317]; minaret [il-minaret-32.32744-35.29034]; minaret [il-minaret-32.33105-35.2965] → minaret [il-minaret-32.32553-35.29317]; minaret [il-minaret-32.32744-35.29034]; minaret [il-minaret-32.33105-35.2965] |
| ג'ודידה (il-32.3355-35.3006) | flat | minaret [il-minaret-32.33105-35.2965]; minaret [il-minaret-32.33628-35.3014]; minaret [il-minaret-32.34882-35.27549] → minaret [il-minaret-32.33105-35.2965]; minaret [il-minaret-32.33628-35.3014] → minaret [il-minaret-32.33105-35.2965]; minaret [il-minaret-32.33628-35.3014] → minaret [il-minaret-32.33105-35.2965]; minaret [il-minaret-32.33628-35.3014] | minaret [il-minaret-32.33105-35.2965]; minaret [il-minaret-32.33628-35.3014]; minaret [il-minaret-32.34882-35.27549] → minaret [il-minaret-32.33105-35.2965]; minaret [il-minaret-32.33628-35.3014] → minaret [il-minaret-32.33105-35.2965]; minaret [il-minaret-32.33628-35.3014] → minaret [il-minaret-32.33105-35.2965]; minaret [il-minaret-32.33628-35.3014] |
| שא-נור (il-32.3369-35.2019) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מית'לון (il-32.3478-35.2738) | flat | minaret [il-minaret-32.34808-35.27242]; minaret [il-minaret-32.34882-35.27549] → minaret [il-minaret-32.34304-35.30514]; minaret [il-minaret-32.34808-35.27242]; minaret [il-minaret-32.34882-35.27549] → minaret [il-minaret-32.34304-35.30514]; minaret [il-minaret-32.34808-35.27242]; minaret [il-minaret-32.34882-35.27549] → minaret [il-minaret-32.34304-35.30514]; minaret [il-minaret-32.34808-35.27242]; minaret [il-minaret-32.34882-35.27549] | minaret [il-minaret-32.34808-35.27242]; minaret [il-minaret-32.34882-35.27549] → minaret [il-minaret-32.34304-35.30514]; minaret [il-minaret-32.34808-35.27242]; minaret [il-minaret-32.34882-35.27549] → minaret [il-minaret-32.34304-35.30514]; minaret [il-minaret-32.34808-35.27242]; minaret [il-minaret-32.34882-35.27549] → minaret [il-minaret-32.34304-35.30514]; minaret [il-minaret-32.34808-35.27242]; minaret [il-minaret-32.34882-35.27549] |
| סאנור (il-32.3568-35.2459) | flat | minaret [il-minaret-32.32728-35.21518]; minaret [il-minaret-32.34808-35.27242] → 0 → 0 → 0 | minaret [il-minaret-32.32728-35.21518]; minaret [il-minaret-32.34808-35.27242] → 0 → 0 → 0 |
| ענזה (il-32.3594-35.2205) | flat | minaret [il-minaret-32.35938-35.22035] → minaret [il-minaret-32.35938-35.22035] → minaret [il-minaret-32.35938-35.22035] → minaret [il-minaret-32.35938-35.22035] | minaret [il-minaret-32.35938-35.22035] → minaret [il-minaret-32.35938-35.22035] → minaret [il-minaret-32.35938-35.22035] → minaret [il-minaret-32.35938-35.22035] |
| אל זאויה (il-32.3757-35.2320) | flat | minaret [il-minaret-32.37586-35.23239] → minaret [il-minaret-32.37586-35.23239] → minaret [il-minaret-32.37586-35.23239] → minaret [il-minaret-32.37586-35.23239] | minaret [il-minaret-32.37586-35.23239] → minaret [il-minaret-32.37586-35.23239] → minaret [il-minaret-32.37586-35.23239] → minaret [il-minaret-32.37586-35.23239] |
| מיסיליה (il-32.3862-35.2880) | flat | minaret [il-minaret-32.38727-35.28699] → minaret [il-minaret-32.38727-35.28699] → minaret [il-minaret-32.38727-35.28699] → minaret [il-minaret-32.38727-35.28699] | minaret [il-minaret-32.38727-35.28699] → minaret [il-minaret-32.38727-35.28699] → minaret [il-minaret-32.38727-35.28699] → minaret [il-minaret-32.38727-35.28699] |
| פחמה אל-ג'דידה (il-32.3893-35.2090) | flat | 0 → minaret [il-minaret-32.37586-35.23239] → minaret [il-minaret-32.37586-35.23239] → 0 | 0 → minaret [il-minaret-32.37586-35.23239] → minaret [il-minaret-32.37586-35.23239] → minaret [il-minaret-32.37586-35.23239] |
| אל מנסורה (il-32.3862-35.2163) | flat | minaret [il-minaret-32.38707-35.21623] → minaret [il-minaret-32.37586-35.23239]; minaret [il-minaret-32.38707-35.21623] → minaret [il-minaret-32.37586-35.23239]; minaret [il-minaret-32.38707-35.21623] → minaret [il-minaret-32.38707-35.21623] | minaret [il-minaret-32.38707-35.21623] → minaret [il-minaret-32.37586-35.23239]; minaret [il-minaret-32.38707-35.21623] → minaret [il-minaret-32.37586-35.23239]; minaret [il-minaret-32.38707-35.21623] → minaret [il-minaret-32.37586-35.23239]; minaret [il-minaret-32.38707-35.21623] |
| מארקה (il-32.3969-35.2387) | flat | minaret [il-minaret-32.39694-35.23726] → minaret [il-minaret-32.39694-35.23726] → minaret [il-minaret-32.39694-35.23726] → minaret [il-minaret-32.39694-35.23726] | minaret [il-minaret-32.39694-35.23726] → minaret [il-minaret-32.39694-35.23726] → minaret [il-minaret-32.39694-35.23726] → minaret [il-minaret-32.39694-35.23726] |
| עראבה (il-32.4047-35.2034) | flat | minaret [il-minaret-32.40396-35.20509]; minaret [il-minaret-32.40476-35.2016]; minaret [il-minaret-32.40657-35.21116] → minaret [il-minaret-32.40396-35.20509]; minaret [il-minaret-32.40476-35.2016]; minaret [il-minaret-32.40657-35.21116] → minaret [il-minaret-32.40396-35.20509]; minaret [il-minaret-32.40476-35.2016]; minaret [il-minaret-32.40657-35.21116] → minaret [il-minaret-32.40396-35.20509]; minaret [il-minaret-32.40476-35.2016]; minaret [il-minaret-32.40657-35.21116] | minaret [il-minaret-32.40396-35.20509]; minaret [il-minaret-32.40476-35.2016]; minaret [il-minaret-32.40657-35.21116] → minaret [il-minaret-32.40396-35.20509]; minaret [il-minaret-32.40476-35.2016]; minaret [il-minaret-32.40657-35.21116] → minaret [il-minaret-32.40396-35.20509]; minaret [il-minaret-32.40476-35.2016]; minaret [il-minaret-32.40657-35.21116] → minaret [il-minaret-32.40396-35.20509]; minaret [il-minaret-32.40476-35.2016]; minaret [il-minaret-32.40657-35.21116] |
| טובאס (il-32.3211-35.3689) | flat | minaret [il-minaret-32.30982-35.37385]; minaret [il-minaret-32.32164-35.36848]; minaret [il-minaret-32.3285-35.36218] → minaret [il-minaret-32.30982-35.37385]; minaret [il-minaret-32.32164-35.36848]; minaret [il-minaret-32.3285-35.36218] → minaret [il-minaret-32.30982-35.37385]; minaret [il-minaret-32.32164-35.36848]; minaret [il-minaret-32.3285-35.36218] → minaret [il-minaret-32.30982-35.37385]; minaret [il-minaret-32.32164-35.36848]; minaret [il-minaret-32.3285-35.36218] | minaret [il-minaret-32.30982-35.37385]; minaret [il-minaret-32.32164-35.36848]; minaret [il-minaret-32.3285-35.36218] → minaret [il-minaret-32.30982-35.37385]; minaret [il-minaret-32.32164-35.36848]; minaret [il-minaret-32.3285-35.36218] → minaret [il-minaret-32.30982-35.37385]; minaret [il-minaret-32.32164-35.36848]; minaret [il-minaret-32.3285-35.36218] → minaret [il-minaret-32.30982-35.37385]; minaret [il-minaret-32.32164-35.36848]; minaret [il-minaret-32.3285-35.36218] |
| תיאסיר (il-32.3395-35.3965) | flat | minaret [il-minaret-32.34135-35.3968] → minaret [il-minaret-32.34135-35.3968] → minaret [il-minaret-32.34135-35.3968] → minaret [il-minaret-32.34135-35.3968] | minaret [il-minaret-32.34135-35.3968] → minaret [il-minaret-32.34135-35.3968] → minaret [il-minaret-32.34135-35.3968] → minaret [il-minaret-32.34135-35.3968] |
| עקאבה (il-32.3507-35.3498) | flat | minaret [il-minaret-32.35081-35.35163] → minaret [il-minaret-32.35081-35.35163] → minaret [il-minaret-32.35081-35.35163] → minaret [il-minaret-32.35081-35.35163] | minaret [il-minaret-32.35081-35.35163] → minaret [il-minaret-32.35081-35.35163] → minaret [il-minaret-32.35081-35.35163] → minaret [il-minaret-32.35081-35.35163] |
| סיר (il-32.3633-35.3144) | flat | minaret [il-minaret-32.34882-35.27549]; minaret [il-minaret-32.36397-35.31443] → minaret [il-minaret-32.36397-35.31443] → minaret [il-minaret-32.36397-35.31443] → minaret [il-minaret-32.36397-35.31443] | minaret [il-minaret-32.34882-35.27549]; minaret [il-minaret-32.36397-35.31443] → minaret [il-minaret-32.36397-35.31443] → minaret [il-minaret-32.36397-35.31443] → minaret [il-minaret-32.36397-35.31443] |
| כופיר (il-32.3721-35.3411) | flat | minaret [il-minaret-32.37297-35.34111] → minaret [il-minaret-32.36397-35.31443]; minaret [il-minaret-32.37297-35.34111] → minaret [il-minaret-32.36397-35.31443]; minaret [il-minaret-32.37297-35.34111] → minaret [il-minaret-32.37297-35.34111] | minaret [il-minaret-32.37297-35.34111] → minaret [il-minaret-32.36397-35.31443]; minaret [il-minaret-32.37297-35.34111] → minaret [il-minaret-32.36397-35.31443]; minaret [il-minaret-32.37297-35.34111] → minaret [il-minaret-32.36397-35.31443]; minaret [il-minaret-32.37297-35.34111] |
| זבאבדה (il-32.3861-35.3248) | flat | minaret [il-minaret-32.36397-35.31443] → 0 → 0 → 0 | minaret [il-minaret-32.36397-35.31443] → 0 → 0 → 0 |
| משכיות (il-32.3173-35.5025) | flat | synagogue [il-synagogue-32.31802-35.50045] → synagogue [il-synagogue-32.31802-35.50045] → synagogue [il-synagogue-32.31802-35.50045] → synagogue [il-synagogue-32.31802-35.50045] | synagogue [il-synagogue-32.31802-35.50045] → synagogue [il-synagogue-32.31802-35.50045] → synagogue [il-synagogue-32.31802-35.50045] → synagogue [il-synagogue-32.31802-35.50045] |
| אל-עקאבה (il-32.3375-35.4163) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קרדאלה (il-32.3797-35.4925) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ברדלה (il-32.3862-35.4807) | flat | minaret [il-minaret-32.38549-35.47929] → minaret [il-minaret-32.38549-35.47929] → minaret [il-minaret-32.38549-35.47929] → minaret [il-minaret-32.38549-35.47929] | minaret [il-minaret-32.38549-35.47929] → minaret [il-minaret-32.38549-35.47929] → minaret [il-minaret-32.38549-35.47929] → minaret [il-minaret-32.38549-35.47929] |
| ברוש הבקעה (il-32.3195-35.5421) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רותם (il-32.3365-35.5188) | flat | synagogue [il-synagogue-32.33673-35.51877] → synagogue [il-synagogue-32.33673-35.51877] → synagogue [il-synagogue-32.33673-35.51877] → synagogue [il-synagogue-32.33673-35.51877] | synagogue [il-synagogue-32.33673-35.51877] → synagogue [il-synagogue-32.33673-35.51877] → synagogue [il-synagogue-32.33673-35.51877] → synagogue [il-synagogue-32.33673-35.51877] |
| אל-פאריסייה (il-32.3556-35.5099) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת סלעית (il-32.3636-35.5100) | flat | synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] | synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] |
| מחולה (il-32.3652-35.5156) | flat | synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] | synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] → synagogue [il-synagogue-32.36595-35.51565] |
| עין אל-בידה (il-32.3807-35.5103) | flat | minaret [il-minaret-32.37978-35.50983] → minaret [il-minaret-32.37978-35.50983] → minaret [il-minaret-32.37978-35.50983] → minaret [il-minaret-32.37978-35.50983] | minaret [il-minaret-32.37978-35.50983] → minaret [il-minaret-32.37978-35.50983] → minaret [il-minaret-32.37978-35.50983] → minaret [il-minaret-32.37978-35.50983] |
| חדרה (il-32.4370-34.9198) | flat | synagogue [il-synagogue-32.43595-34.91766] → synagogue [il-synagogue-32.43595-34.91766] → synagogue [il-synagogue-32.43595-34.91766] → synagogue [il-synagogue-32.43595-34.91766] | synagogue [il-synagogue-32.43595-34.91766] → synagogue [il-synagogue-32.43595-34.91766] → synagogue [il-synagogue-32.43595-34.91766] → synagogue [il-synagogue-32.43595-34.91766] |
| שדות ים (il-32.4922-34.8933) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אור עקיבא (il-32.5090-34.9196) | flat | synagogue [il-synagogue-32.5092-34.92179] → synagogue [il-synagogue-32.5092-34.92179] → synagogue [il-synagogue-32.5092-34.92179] → synagogue [il-synagogue-32.5092-34.92179] | synagogue [il-synagogue-32.5092-34.92179] → synagogue [il-synagogue-32.5092-34.92179] → synagogue [il-synagogue-32.5092-34.92179] → synagogue [il-synagogue-32.5092-34.92179] |
| קיסריה (il-32.5131-34.9058) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג׳סר א־זרקא (il-32.5376-34.9132) | flat | minaret [il-minaret-32.53703-34.91214]; minaret [il-minaret-32.53975-34.91371] → minaret [il-minaret-32.53703-34.91214]; minaret [il-minaret-32.53975-34.91371] → minaret [il-minaret-32.53703-34.91214]; minaret [il-minaret-32.53975-34.91371] → minaret [il-minaret-32.53703-34.91214]; minaret [il-minaret-32.53975-34.91371] | minaret [il-minaret-32.53703-34.91214]; minaret [il-minaret-32.53975-34.91371] → minaret [il-minaret-32.53703-34.91214]; minaret [il-minaret-32.53975-34.91371] → minaret [il-minaret-32.53703-34.91214]; minaret [il-minaret-32.53975-34.91371] → minaret [il-minaret-32.53703-34.91214]; minaret [il-minaret-32.53975-34.91371] |
| בית חנניה (il-32.5283-34.9250) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעגן מיכאל (il-32.5553-34.9167) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה יצחק (il-32.4051-34.9938) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תלמי אלעזר (il-32.4432-34.9737) | flat | synagogue [il-synagogue-32.44569-34.97423] → synagogue [il-synagogue-32.44569-34.97423] → synagogue [il-synagogue-32.44569-34.97423] → synagogue [il-synagogue-32.44569-34.97423] | synagogue [il-synagogue-32.44569-34.97423] → synagogue [il-synagogue-32.44569-34.97423] → synagogue [il-synagogue-32.44569-34.97423] → synagogue [il-synagogue-32.44569-34.97423] |
| גן שמואל (il-32.4518-34.9498) | flat | 0 → synagogue [il-synagogue-32.44723-34.92222] → synagogue [il-synagogue-32.44723-34.92222] → 0 | 0 → synagogue [il-synagogue-32.44723-34.92222] → synagogue [il-synagogue-32.44723-34.92222] → 0 |
| גן השומרון (il-32.4639-34.9984) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פרדס חנה-כרכור (il-32.4750-34.9751) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין שמר (il-32.4629-35.0074) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר פינס (il-32.4839-35.0034) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משמרות (il-32.4875-34.9850) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין עירון (il-32.4835-35.0099) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| באקה אל-גרביה (il-32.4197-35.0428) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נזלה עיסה (il-32.4162-35.0568) | flat | 0 → 0 → minaret [il-minaret-32.41359-35.0445] → 0 | 0 → 0 → minaret [il-minaret-32.41359-35.0445] → 0 |
| באקה א-שרקיה (il-32.4099-35.0702) | flat | minaret [il-minaret-32.41099-35.07168]; minaret [il-minaret-32.41359-35.0445] → minaret [il-minaret-32.41099-35.07168] → minaret [il-minaret-32.41099-35.07168] → minaret [il-minaret-32.41099-35.07168] | minaret [il-minaret-32.41099-35.07168]; minaret [il-minaret-32.41359-35.0445] → minaret [il-minaret-32.41099-35.07168] → minaret [il-minaret-32.41099-35.07168] → minaret [il-minaret-32.41099-35.07168] |
| אל-נזלה אל-וסטה (il-32.4086-35.0965) | flat | minaret [il-minaret-32.40805-35.09608] → minaret [il-minaret-32.40805-35.09608] → minaret [il-minaret-32.40805-35.09608] → minaret [il-minaret-32.40805-35.09608] | minaret [il-minaret-32.40805-35.09608] → minaret [il-minaret-32.40805-35.09608] → minaret [il-minaret-32.40805-35.09608] → minaret [il-minaret-32.40805-35.09608] |
| מאור (il-32.4239-35.0064) | flat | synagogue [il-synagogue-32.42326-35.00475] → synagogue [il-synagogue-32.42326-35.00475] → synagogue [il-synagogue-32.42326-35.00475] → synagogue [il-synagogue-32.42326-35.00475] | synagogue [il-synagogue-32.42326-35.00475] → synagogue [il-synagogue-32.42326-35.00475] → synagogue [il-synagogue-32.42326-35.00475] → synagogue [il-synagogue-32.42326-35.00475] |
| קפין (il-32.4336-35.0835) | flat | minaret [il-minaret-32.41359-35.0445]; minaret [il-minaret-32.43243-35.08454] → minaret [il-minaret-32.43243-35.08454] → minaret [il-minaret-32.43243-35.08454] → minaret [il-minaret-32.43243-35.08454] | minaret [il-minaret-32.41359-35.0445]; minaret [il-minaret-32.43243-35.08454] → minaret [il-minaret-32.43243-35.08454] → minaret [il-minaret-32.43243-35.08454] → minaret [il-minaret-32.43243-35.08454] |
| עכאבה (il-32.4484-35.0818) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דהר אל-אבד (il-32.4502-35.0939) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מצפה אילן (il-32.4615-35.0692) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ברטעה (il-32.4743-35.0903) | flat | minaret [il-minaret-32.47573-35.08904] → minaret [il-minaret-32.47573-35.08904] → minaret [il-minaret-32.47573-35.08904] → minaret [il-minaret-32.47573-35.08904] | minaret [il-minaret-32.47573-35.08904] → minaret [il-minaret-32.47573-35.08904] → minaret [il-minaret-32.47573-35.08904] → minaret [il-minaret-32.47573-35.08904] |
| קציר (il-32.4886-35.1017) | flat | synagogue [il-synagogue-32.48387-35.10941] → synagogue [il-synagogue-32.48387-35.10941] → synagogue [il-synagogue-32.48387-35.10941] → synagogue [il-synagogue-32.48387-35.10941] | synagogue [il-synagogue-32.48387-35.10941] → synagogue [il-synagogue-32.48387-35.10941] → synagogue [il-synagogue-32.48387-35.10941] → synagogue [il-synagogue-32.48387-35.10941] |
| ערערה (il-32.4965-35.0956) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר קרע (il-32.5030-35.0505) | flat | minaret [il-minaret-32.50721-35.04435] → minaret [il-minaret-32.50721-35.04435] → minaret [il-minaret-32.50721-35.04435] → minaret [il-minaret-32.50721-35.04435] | minaret [il-minaret-32.50721-35.04435] → minaret [il-minaret-32.50721-35.04435] → minaret [il-minaret-32.50721-35.04435] → minaret [il-minaret-32.50721-35.04435] |
| אל-נזלה א-שרקיה (il-32.4114-35.1075) | flat | minaret [il-minaret-32.41116-35.10731] → minaret [il-minaret-32.41116-35.10731] → minaret [il-minaret-32.41116-35.10731] → minaret [il-minaret-32.41116-35.10731] | minaret [il-minaret-32.41116-35.10731] → minaret [il-minaret-32.41116-35.10731] → minaret [il-minaret-32.41116-35.10731] → minaret [il-minaret-32.41116-35.10731] |
| חרבת אל-חמאם (il-32.4187-35.1279) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מבוא דותן (il-32.4207-35.1748) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חרמש (il-32.4232-35.1188) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעוז (il-32.4249-35.1651) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אמריחה (il-32.4325-35.1464) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יעבד (il-32.4463-35.1694) | flat | minaret [il-minaret-32.44711-35.16901]; minaret [il-minaret-32.4506-35.16939] → minaret [il-minaret-32.44711-35.16901]; minaret [il-minaret-32.4506-35.16939] → minaret [il-minaret-32.44711-35.16901]; minaret [il-minaret-32.4506-35.16939] → minaret [il-minaret-32.44711-35.16901]; minaret [il-minaret-32.4506-35.16939] | minaret [il-minaret-32.44711-35.16901]; minaret [il-minaret-32.4506-35.16939] → minaret [il-minaret-32.44711-35.16901]; minaret [il-minaret-32.4506-35.16939] → minaret [il-minaret-32.44711-35.16901]; minaret [il-minaret-32.4506-35.16939] → minaret [il-minaret-32.44711-35.16901]; minaret [il-minaret-32.4506-35.16939] |
| נזלת א-שייח' זייד (il-32.4625-35.1754) | flat | minaret [il-minaret-32.46253-35.17581] → minaret [il-minaret-32.46253-35.17581] → minaret [il-minaret-32.46253-35.17581] → minaret [il-minaret-32.46253-35.17581] | minaret [il-minaret-32.46253-35.17581] → minaret [il-minaret-32.46253-35.17581] → minaret [il-minaret-32.46253-35.17581] → minaret [il-minaret-32.46253-35.17581] |
| אל נווה (il-32.4378-35.1131) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כופרית (il-32.4435-35.2042) | flat | minaret [il-minaret-32.44435-35.20342] → minaret [il-minaret-32.44435-35.20342] → minaret [il-minaret-32.44435-35.20342] → minaret [il-minaret-32.44435-35.20342] | minaret [il-minaret-32.44435-35.20342] → minaret [il-minaret-32.44435-35.20342] → minaret [il-minaret-32.44435-35.20342] → minaret [il-minaret-32.44435-35.20342] |
| זיבדה (il-32.4503-35.1307) | flat | minaret [il-minaret-32.44942-35.13078] → minaret [il-minaret-32.44942-35.13078] → minaret [il-minaret-32.44942-35.13078] → minaret [il-minaret-32.44942-35.13078] | minaret [il-minaret-32.44942-35.13078] → minaret [il-minaret-32.44942-35.13078] → minaret [il-minaret-32.44942-35.13078] → minaret [il-minaret-32.44942-35.13078] |
| אום דאר (il-32.4587-35.1350) | flat | minaret [il-minaret-32.4581-35.13568] → minaret [il-minaret-32.4581-35.13568] → minaret [il-minaret-32.4581-35.13568] → minaret [il-minaret-32.4581-35.13568] | minaret [il-minaret-32.4581-35.13568] → minaret [il-minaret-32.4581-35.13568] → minaret [il-minaret-32.4581-35.13568] → minaret [il-minaret-32.4581-35.13568] |
| אל-תרם (il-32.4620-35.1898) | flat | minaret [il-minaret-32.46291-35.19127] → minaret [il-minaret-32.46291-35.19127] → minaret [il-minaret-32.46291-35.19127] → minaret [il-minaret-32.46291-35.19127] | minaret [il-minaret-32.46291-35.19127] → minaret [il-minaret-32.46291-35.19127] → minaret [il-minaret-32.46291-35.19127] → minaret [il-minaret-32.46291-35.19127] |
| טורה אל-שרקייה (il-32.4662-35.1658) | flat | minaret [il-minaret-32.46668-35.16486] → minaret [il-minaret-32.46668-35.16486] → minaret [il-minaret-32.46668-35.16486] → minaret [il-minaret-32.46668-35.16486] | minaret [il-minaret-32.46668-35.16486] → minaret [il-minaret-32.46668-35.16486] → minaret [il-minaret-32.46668-35.16486] → minaret [il-minaret-32.46668-35.16486] |
| שקד (il-32.4737-35.1686) | flat | synagogue [il-synagogue-32.47506-35.16761] → synagogue [il-synagogue-32.47506-35.16761] → synagogue [il-synagogue-32.47506-35.16761] → synagogue [il-synagogue-32.47506-35.16761] | synagogue [il-synagogue-32.47506-35.16761] → synagogue [il-synagogue-32.47506-35.16761] → synagogue [il-synagogue-32.47506-35.16761] → synagogue [il-synagogue-32.47506-35.16761] |
| טורה אל-גרבייה (il-32.4677-35.1528) | flat | minaret [il-minaret-32.46842-35.15242] → minaret [il-minaret-32.46842-35.15242] → minaret [il-minaret-32.46842-35.15242] → minaret [il-minaret-32.46842-35.15242] | minaret [il-minaret-32.46842-35.15242] → minaret [il-minaret-32.46842-35.15242] → minaret [il-minaret-32.46842-35.15242] → minaret [il-minaret-32.46842-35.15242] |
| דהר אל-מאלח (il-32.4732-35.1598) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חיננית (il-32.4808-35.1735) | flat | synagogue [il-synagogue-32.48083-35.17102] → synagogue [il-synagogue-32.48083-35.17102] → synagogue [il-synagogue-32.48083-35.17102] → synagogue [il-synagogue-32.48083-35.17102] | synagogue [il-synagogue-32.48083-35.17102] → synagogue [il-synagogue-32.48083-35.17102] → synagogue [il-synagogue-32.48083-35.17102] → synagogue [il-synagogue-32.48083-35.17102] |
| ריחן (il-32.4687-35.1352) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-עראקה (il-32.4698-35.2009) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חרבת עבדאללה אל-יונס (il-32.4757-35.1146) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אום א-ריחאן (il-32.4835-35.1420) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טל מנשה (il-32.4834-35.1604) | flat | synagogue [il-synagogue-32.48277-35.16154] → synagogue [il-synagogue-32.48277-35.16154] → synagogue [il-synagogue-32.48277-35.16154] → synagogue [il-synagogue-32.48277-35.16154] | synagogue [il-synagogue-32.48277-35.16154] → synagogue [il-synagogue-32.48277-35.16154] → synagogue [il-synagogue-32.48277-35.16154] → synagogue [il-synagogue-32.48277-35.16154] |
| חרבת סורוג' (il-32.4875-35.1968) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ח'לית אנג'ס (il-32.4967-35.1897) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עאנין (il-32.5012-35.1676) | flat | minaret [il-minaret-32.50115-35.16964]; minaret [il-minaret-32.50123-35.16581] → minaret [il-minaret-32.50115-35.16964]; minaret [il-minaret-32.50123-35.16581] → minaret [il-minaret-32.50115-35.16964]; minaret [il-minaret-32.50123-35.16581] → minaret [il-minaret-32.50115-35.16964]; minaret [il-minaret-32.50123-35.16581] | minaret [il-minaret-32.50115-35.16964]; minaret [il-minaret-32.50123-35.16581] → minaret [il-minaret-32.50115-35.16964]; minaret [il-minaret-32.50123-35.16581] → minaret [il-minaret-32.50115-35.16964]; minaret [il-minaret-32.50123-35.16581] → minaret [il-minaret-32.50115-35.16964]; minaret [il-minaret-32.50123-35.16581] |
| מי עמי (il-32.5047-35.1465) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אום אל-פחם (il-32.5158-35.1525) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קבטייה (il-32.4095-35.2801) | flat | minaret [il-minaret-32.40979-35.28042] → minaret [il-minaret-32.40979-35.28042] → minaret [il-minaret-32.40979-35.28042] → minaret [il-minaret-32.40979-35.28042] | minaret [il-minaret-32.40979-35.28042] → minaret [il-minaret-32.40979-35.28042] → minaret [il-minaret-32.40979-35.28042] → minaret [il-minaret-32.40979-35.28042] |
| אל-שוהאדה (il-32.4286-35.2755) | flat | minaret [il-minaret-32.43025-35.2766] → minaret [il-minaret-32.43025-35.2766] → minaret [il-minaret-32.43025-35.2766] → minaret [il-minaret-32.43025-35.2766] | minaret [il-minaret-32.43025-35.2766] → minaret [il-minaret-32.43025-35.2766] → minaret [il-minaret-32.43025-35.2766] → minaret [il-minaret-32.43025-35.2766] |
| ביר אל-באשא (il-32.4215-35.2304) | flat | minaret [il-minaret-32.40476-35.2016] → 0 → 0 → 0 | minaret [il-minaret-32.40476-35.2016] → 0 → 0 → 0 |
| בורקין (il-32.4561-35.2607) | flat | minaret [il-minaret-32.45595-35.26135]; minaret [il-minaret-32.45688-35.25394]; minaret [il-minaret-32.45695-35.29699] → minaret [il-minaret-32.45595-35.26135]; minaret [il-minaret-32.45688-35.25394] → minaret [il-minaret-32.45595-35.26135]; minaret [il-minaret-32.45688-35.25394] → minaret [il-minaret-32.45595-35.26135]; minaret [il-minaret-32.45688-35.25394] | minaret [il-minaret-32.45595-35.26135]; minaret [il-minaret-32.45688-35.25394]; minaret [il-minaret-32.45695-35.29699] → minaret [il-minaret-32.45595-35.26135]; minaret [il-minaret-32.45688-35.25394] → minaret [il-minaret-32.45595-35.26135]; minaret [il-minaret-32.45688-35.25394] → minaret [il-minaret-32.45595-35.26135]; minaret [il-minaret-32.45688-35.25394] |
| ג'נין‎ (il-32.4621-35.2976) | flat | minaret [il-minaret-32.45923-35.29392]; minaret [il-minaret-32.46485-35.29892] → minaret [il-minaret-32.45923-35.29392]; minaret [il-minaret-32.46485-35.29892] → minaret [il-minaret-32.45923-35.29392]; minaret [il-minaret-32.46485-35.29892] → minaret [il-minaret-32.45923-35.29392]; minaret [il-minaret-32.46485-35.29892] | minaret [il-minaret-32.45923-35.29392]; minaret [il-minaret-32.45997-35.28564]; minaret [il-minaret-32.46485-35.29892] → minaret [il-minaret-32.45923-35.29392]; minaret [il-minaret-32.46485-35.29892] → minaret [il-minaret-32.45923-35.29392]; minaret [il-minaret-32.46485-35.29892] → minaret [il-minaret-32.45923-35.29392]; minaret [il-minaret-32.46485-35.29892] |
| מ.פ. ג'נין (il-32.4605-35.2882) | flat | minaret [il-minaret-32.45695-35.29699]; minaret [il-minaret-32.45991-35.29018]; minaret [il-minaret-32.46441-35.28771] → minaret [il-minaret-32.45991-35.29018]; minaret [il-minaret-32.46441-35.28771] → minaret [il-minaret-32.45991-35.29018]; minaret [il-minaret-32.46441-35.28771] → minaret [il-minaret-32.45991-35.29018]; minaret [il-minaret-32.46441-35.28771] | minaret [il-minaret-32.45695-35.29699]; minaret [il-minaret-32.45991-35.29018]; minaret [il-minaret-32.46441-35.28771] → minaret [il-minaret-32.45991-35.29018]; minaret [il-minaret-32.46441-35.28771] → minaret [il-minaret-32.45991-35.29018]; minaret [il-minaret-32.46441-35.28771] → minaret [il-minaret-32.45991-35.29018]; minaret [il-minaret-32.46441-35.28771] |
| עאבא (il-32.4617-35.3240) | flat | 0 → minaret [il-minaret-32.45695-35.29699] → minaret [il-minaret-32.45695-35.29699] → minaret [il-minaret-32.45695-35.29699] | 0 → minaret [il-minaret-32.45695-35.29699] → minaret [il-minaret-32.45695-35.29699] → minaret [il-minaret-32.45695-35.29699] |
| כפר קוד (il-32.4568-35.2285) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל - האשמיה (il-32.4653-35.2216) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-יאמון (il-32.4838-35.2300) | flat | minaret [il-minaret-32.48351-35.23122]; minaret [il-minaret-32.48503-35.22616] → minaret [il-minaret-32.48351-35.23122]; minaret [il-minaret-32.48503-35.22616] → minaret [il-minaret-32.48351-35.23122]; minaret [il-minaret-32.48503-35.22616] → minaret [il-minaret-32.48351-35.23122]; minaret [il-minaret-32.48503-35.22616] | minaret [il-minaret-32.48351-35.23122]; minaret [il-minaret-32.48503-35.22616] → minaret [il-minaret-32.48351-35.23122]; minaret [il-minaret-32.48503-35.22616] → minaret [il-minaret-32.48351-35.23122]; minaret [il-minaret-32.48503-35.22616] → minaret [il-minaret-32.48351-35.23122]; minaret [il-minaret-32.48503-35.22616] |
| כפר דאן (il-32.4775-35.2535) | flat | minaret [il-minaret-32.45695-35.29699]; minaret [il-minaret-32.46441-35.28771] → 0 → 0 → 0 | minaret [il-minaret-32.45695-35.29699]; minaret [il-minaret-32.46441-35.28771] → 0 → 0 → 0 |
| תנין (il-32.4151-35.3398) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-מוע'אייר (il-32.4214-35.3862) | flat | minaret [il-minaret-32.4212-35.38471] → minaret [il-minaret-32.4212-35.38471] → minaret [il-minaret-32.4212-35.38471] → minaret [il-minaret-32.4212-35.38471] | minaret [il-minaret-32.4212-35.38471] → minaret [il-minaret-32.4212-35.38471] → minaret [il-minaret-32.4212-35.38471] → minaret [il-minaret-32.4212-35.38471] |
| ג'לקמוס (il-32.4254-35.3646) | flat | minaret [il-minaret-32.42655-35.3628] → minaret [il-minaret-32.42655-35.3628] → minaret [il-minaret-32.42655-35.3628] → minaret [il-minaret-32.42655-35.3628] | minaret [il-minaret-32.42655-35.3628] → minaret [il-minaret-32.42655-35.3628] → minaret [il-minaret-32.42655-35.3628] → minaret [il-minaret-32.42655-35.3628] |
| דיר אבו ד'עיף (il-32.4554-35.3645) | flat | minaret [il-minaret-32.45698-35.35843] → minaret [il-minaret-32.45698-35.35843] → minaret [il-minaret-32.45698-35.35843] → minaret [il-minaret-32.45698-35.35843] | minaret [il-minaret-32.45698-35.35843] → minaret [il-minaret-32.45698-35.35843] → minaret [il-minaret-32.45698-35.35843] → minaret [il-minaret-32.45698-35.35843] |
| בית קאד (il-32.4696-35.3558) | flat | minaret [il-minaret-32.46912-35.35651] → minaret [il-minaret-32.46912-35.35651] → minaret [il-minaret-32.46912-35.35651] → minaret [il-minaret-32.46912-35.35651] | minaret [il-minaret-32.46912-35.35651] → minaret [il-minaret-32.46912-35.35651] → minaret [il-minaret-32.46912-35.35651] → minaret [il-minaret-32.46912-35.35651] |
| חרבת אבו ענקר (il-32.4837-35.3794) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פקועה (il-32.4905-35.4011) | flat | minaret [il-minaret-32.48892-35.4006]; minaret [il-minaret-32.49396-35.39323] → minaret [il-minaret-32.48892-35.4006]; minaret [il-minaret-32.49396-35.39323] → minaret [il-minaret-32.48892-35.4006]; minaret [il-minaret-32.49396-35.39323] → minaret [il-minaret-32.48892-35.4006]; minaret [il-minaret-32.49396-35.39323] | minaret [il-minaret-32.48892-35.4006]; minaret [il-minaret-32.49396-35.39323] → minaret [il-minaret-32.48892-35.4006]; minaret [il-minaret-32.49396-35.39323] → minaret [il-minaret-32.48892-35.4006]; minaret [il-minaret-32.49396-35.39323] → minaret [il-minaret-32.48892-35.4006]; minaret [il-minaret-32.49396-35.39323] |
| עראנה (il-32.4973-35.3218) | flat | minaret [il-minaret-32.49901-35.32234] → minaret [il-minaret-32.49901-35.32234] → minaret [il-minaret-32.49901-35.32234] → minaret [il-minaret-32.49901-35.32234] | minaret [il-minaret-32.49901-35.32234] → minaret [il-minaret-32.49901-35.32234] → minaret [il-minaret-32.49901-35.32234] → minaret [il-minaret-32.49901-35.32234] |
| דיר ע'זאלה (il-32.4957-35.3518) | flat | minaret [il-minaret-32.49616-35.35058] → minaret [il-minaret-32.49616-35.35058] → minaret [il-minaret-32.49616-35.35058] → minaret [il-minaret-32.49616-35.35058] | minaret [il-minaret-32.49616-35.35058] → minaret [il-minaret-32.49616-35.35058] → minaret [il-minaret-32.49616-35.35058] → minaret [il-minaret-32.49616-35.35058] |
| אל-מוטילה (il-32.4201-35.4077) | flat | minaret [il-minaret-32.42052-35.40758] → minaret [il-minaret-32.42052-35.40758] → minaret [il-minaret-32.42052-35.40758] → minaret [il-minaret-32.42052-35.40758] | minaret [il-minaret-32.42052-35.40758] → minaret [il-minaret-32.42052-35.40758] → minaret [il-minaret-32.42052-35.40758] → minaret [il-minaret-32.42052-35.40758] |
| שדי תרומות (il-32.4414-35.4854) | flat | synagogue [il-synagogue-32.43961-35.48555] → synagogue [il-synagogue-32.43961-35.48555] → synagogue [il-synagogue-32.43961-35.48555] → synagogue [il-synagogue-32.43961-35.48555] | synagogue [il-synagogue-32.43961-35.48555] → synagogue [il-synagogue-32.43961-35.48555] → synagogue [il-synagogue-32.43961-35.48555] → synagogue [il-synagogue-32.43961-35.48555] |
| רחוב (il-32.4519-35.4886) | flat | synagogue [il-synagogue-32.45104-35.49114]; synagogue [il-synagogue-32.45207-35.48658] → synagogue [il-synagogue-32.45104-35.49114]; synagogue [il-synagogue-32.45207-35.48658] → synagogue [il-synagogue-32.45104-35.49114]; synagogue [il-synagogue-32.45207-35.48658] → synagogue [il-synagogue-32.45104-35.49114]; synagogue [il-synagogue-32.45207-35.48658] | synagogue [il-synagogue-32.45104-35.49114]; synagogue [il-synagogue-32.45207-35.48658] → synagogue [il-synagogue-32.45104-35.49114]; synagogue [il-synagogue-32.45207-35.48658] → synagogue [il-synagogue-32.45104-35.49114]; synagogue [il-synagogue-32.45207-35.48658] → synagogue [il-synagogue-32.45104-35.49114]; synagogue [il-synagogue-32.45207-35.48658] |
| תל תאומים (il-32.4424-35.4965) | flat | synagogue [il-synagogue-32.44131-35.49346] → synagogue [il-synagogue-32.44131-35.49346] → synagogue [il-synagogue-32.44131-35.49346] → synagogue [il-synagogue-32.44131-35.49346] | synagogue [il-synagogue-32.44131-35.49346] → synagogue [il-synagogue-32.44131-35.49346] → synagogue [il-synagogue-32.44131-35.49346] → synagogue [il-synagogue-32.44131-35.49346] |
| מלכישוע (il-32.4385-35.4130) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רוויה (il-32.4492-35.4727) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מירב (il-32.4534-35.4215) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג'לבון (il-32.4598-35.4153) | flat | minaret [il-minaret-32.45963-35.41444] → minaret [il-minaret-32.45963-35.41444] → minaret [il-minaret-32.45963-35.41444] → minaret [il-minaret-32.45963-35.41444] | minaret [il-minaret-32.45963-35.41444] → minaret [il-minaret-32.45963-35.41444] → minaret [il-minaret-32.45963-35.41444] → minaret [il-minaret-32.45963-35.41444] |
| עין הנציב (il-32.4698-35.5015) | flat | synagogue [il-synagogue-32.47303-35.50124] → synagogue [il-synagogue-32.47303-35.50124] → synagogue [il-synagogue-32.47303-35.50124] → synagogue [il-synagogue-32.47303-35.50124] | synagogue [il-synagogue-32.47303-35.50124] → synagogue [il-synagogue-32.47303-35.50124] → synagogue [il-synagogue-32.47303-35.50124] → synagogue [il-synagogue-32.47303-35.50124] |
| מעלה גלבוע (il-32.4780-35.4175) | flat | minaret [il-minaret-32.45963-35.41444]; synagogue [il-synagogue-32.47782-35.41828] → synagogue [il-synagogue-32.47782-35.41828] → synagogue [il-synagogue-32.47782-35.41828] → synagogue [il-synagogue-32.47782-35.41828] | minaret [il-minaret-32.45963-35.41444]; synagogue [il-synagogue-32.47782-35.41828] → synagogue [il-synagogue-32.47782-35.41828] → synagogue [il-synagogue-32.47782-35.41828] → synagogue [il-synagogue-32.47782-35.41828] |
| שלוחות (il-32.4715-35.4808) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שלפים (il-32.4763-35.4772) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רשפים (il-32.4819-35.4775) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מסילות (il-32.4958-35.4750) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טירת צבי (il-32.4219-35.5280) | flat | synagogue [il-synagogue-32.41974-35.52829] → synagogue [il-synagogue-32.41974-35.52829] → synagogue [il-synagogue-32.41974-35.52829] → synagogue [il-synagogue-32.41974-35.52829] | synagogue [il-synagogue-32.41974-35.52829] → synagogue [il-synagogue-32.41974-35.52829] → synagogue [il-synagogue-32.41974-35.52829] → synagogue [il-synagogue-32.41974-35.52829] |
| שדה אליהו (il-32.4405-35.5150) | flat | synagogue [il-synagogue-32.41974-35.52829]; synagogue [il-synagogue-32.43826-35.51237] → synagogue [il-synagogue-32.43826-35.51237] → synagogue [il-synagogue-32.43826-35.51237] → synagogue [il-synagogue-32.43826-35.51237] | synagogue [il-synagogue-32.41974-35.52829]; synagogue [il-synagogue-32.43826-35.51237] → synagogue [il-synagogue-32.43826-35.51237] → synagogue [il-synagogue-32.43826-35.51237] → synagogue [il-synagogue-32.43826-35.51237] |
| כפר רופין (il-32.4582-35.5568) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעוז חיים (il-32.4934-35.5513) | flat | synagogue [il-synagogue-32.49366-35.54663] → synagogue [il-synagogue-32.49366-35.54663] → synagogue [il-synagogue-32.49366-35.54663] → synagogue [il-synagogue-32.49366-35.54663] | synagogue [il-synagogue-32.49366-35.54663] → synagogue [il-synagogue-32.49366-35.54663] → synagogue [il-synagogue-32.49366-35.54663] → synagogue [il-synagogue-32.49366-35.54663] |
| נווה איתן (il-32.4921-35.5328) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| خربة شيخ محمد (il-32.4990-35.5809) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| الحراوية (il-32.4995-35.5821) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בנימינה (il-32.5203-34.9436) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת עדה (il-32.5167-35.0035) | flat | synagogue [il-synagogue-32.51787-35.0037]; synagogue [il-synagogue-32.52116-35.01025] → synagogue [il-synagogue-32.51787-35.0037]; synagogue [il-synagogue-32.52116-35.01025] → synagogue [il-synagogue-32.51787-35.0037]; synagogue [il-synagogue-32.52116-35.01025] → synagogue [il-synagogue-32.51787-35.0037]; synagogue [il-synagogue-32.52116-35.01025] | synagogue [il-synagogue-32.51787-35.0037]; synagogue [il-synagogue-32.52116-35.01025] → synagogue [il-synagogue-32.51787-35.0037]; synagogue [il-synagogue-32.52116-35.01025] → synagogue [il-synagogue-32.51787-35.0037]; synagogue [il-synagogue-32.52116-35.01025] → synagogue [il-synagogue-32.51787-35.0037]; synagogue [il-synagogue-32.52116-35.01025] |
| אלוני יצחק (il-32.5107-35.0042) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר גליקסון (il-32.5050-35.0048) | flat | synagogue [il-synagogue-32.50454-35.00489] → synagogue [il-synagogue-32.50454-35.00489] → synagogue [il-synagogue-32.50454-35.00489] → synagogue [il-synagogue-32.50454-35.00489] | synagogue [il-synagogue-32.50454-35.00489] → synagogue [il-synagogue-32.50454-35.00489] → synagogue [il-synagogue-32.50454-35.00489] → synagogue [il-synagogue-32.50454-35.00489] |
| אביאל (il-32.5325-34.9934) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעיין צבי (il-32.5683-34.9401) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פוריידיס (il-32.5988-34.9542) | flat | minaret [il-minaret-32.59778-34.95519]; minaret [il-minaret-32.60269-34.95391] → minaret [il-minaret-32.59778-34.95519]; minaret [il-minaret-32.60269-34.95391] → minaret [il-minaret-32.59778-34.95519]; minaret [il-minaret-32.60269-34.95391] → minaret [il-minaret-32.59778-34.95519]; minaret [il-minaret-32.60269-34.95391] | minaret [il-minaret-32.59778-34.95519]; minaret [il-minaret-32.60269-34.95391] → minaret [il-minaret-32.59778-34.95519]; minaret [il-minaret-32.60269-34.95391] → minaret [il-minaret-32.59778-34.95519]; minaret [il-minaret-32.60269-34.95391] → minaret [il-minaret-32.59778-34.95519]; minaret [il-minaret-32.60269-34.95391] |
| כפר הנוער מאיר שפיה (il-32.5915-34.9709) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רגבים (il-32.5241-35.0345) | flat | synagogue [il-synagogue-32.52318-35.0337] → synagogue [il-synagogue-32.52318-35.0337] → synagogue [il-synagogue-32.52318-35.0337] → synagogue [il-synagogue-32.52318-35.0337] | synagogue [il-synagogue-32.52318-35.0337] → synagogue [il-synagogue-32.52318-35.0337] → synagogue [il-synagogue-32.52318-35.0337] → synagogue [il-synagogue-32.52318-35.0337] |
| גבעת ניל"י (il-32.5473-35.0423) | flat | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 |
| גלעד (il-32.5573-35.0757) | flat | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 |
| עמיקם (il-32.5639-35.0205) | flat | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 |
| דליה (il-32.5893-35.0758) | flat | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 |
| רמות מנשה (il-32.5979-35.0577) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין השופט (il-32.5958-35.1000) | flat | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 | synagogue [il-synagogue-32.57398-34.95381] → 0 → 0 → 0 |
| בת שלמה (il-32.5994-35.0029) | flat | synagogue [il-synagogue-32.596-35.00447] → synagogue [il-synagogue-32.596-35.00447] → synagogue [il-synagogue-32.596-35.00447] → synagogue [il-synagogue-32.596-35.00447] | synagogue [il-synagogue-32.596-35.00447] → synagogue [il-synagogue-32.596-35.00447] → synagogue [il-synagogue-32.596-35.00447] → synagogue [il-synagogue-32.596-35.00447] |
| א-סעאידה (il-32.5053-35.1987) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טייבה (il-32.5150-35.1842) | flat | minaret [il-minaret-32.5145-35.18781]; minaret [il-minaret-32.51727-35.1812] → minaret [il-minaret-32.5145-35.18781]; minaret [il-minaret-32.51727-35.1812] → minaret [il-minaret-32.5145-35.18781]; minaret [il-minaret-32.51727-35.1812] → minaret [il-minaret-32.5145-35.18781]; minaret [il-minaret-32.51727-35.1812] | minaret [il-minaret-32.5145-35.18781]; minaret [il-minaret-32.51727-35.1812] → minaret [il-minaret-32.5145-35.18781]; minaret [il-minaret-32.51727-35.1812] → minaret [il-minaret-32.5145-35.18781]; minaret [il-minaret-32.51727-35.1812] → minaret [il-minaret-32.5145-35.18781]; minaret [il-minaret-32.51727-35.1812] |
| רומאנה (il-32.5239-35.2058) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מגידו (il-32.5787-35.1807) | flat | church [il-church-32.63064-35.35011] → 0 → 0 → 0 | church [il-church-32.63064-35.35011] → 0 → 0 → 0 |
| סילת אל-חארתיה (il-32.5078-35.2282) | flat | minaret [il-minaret-32.50647-35.22892]; minaret [il-minaret-32.51525-35.22733] → minaret [il-minaret-32.50647-35.22892]; minaret [il-minaret-32.51525-35.22733] → minaret [il-minaret-32.50647-35.22892]; minaret [il-minaret-32.51525-35.22733] → minaret [il-minaret-32.50647-35.22892]; minaret [il-minaret-32.51525-35.22733] | minaret [il-minaret-32.50647-35.22892]; minaret [il-minaret-32.51525-35.22733] → minaret [il-minaret-32.50647-35.22892]; minaret [il-minaret-32.51525-35.22733] → minaret [il-minaret-32.50647-35.22892]; minaret [il-minaret-32.51525-35.22733] → minaret [il-minaret-32.50647-35.22892]; minaret [il-minaret-32.51525-35.22733] |
| מוקיבלה (il-32.5140-35.2976) | flat | minaret [il-minaret-32.51432-35.29485] → minaret [il-minaret-32.51432-35.29485] → minaret [il-minaret-32.51432-35.29485] → minaret [il-minaret-32.51432-35.29485] | minaret [il-minaret-32.51432-35.29485] → minaret [il-minaret-32.51432-35.29485] → minaret [il-minaret-32.51432-35.29485] → minaret [il-minaret-32.51432-35.29485] |
| תענכ (il-32.5181-35.2207) | flat | minaret [il-minaret-32.51978-35.22098] → minaret [il-minaret-32.51978-35.22098] → minaret [il-minaret-32.51978-35.22098] → minaret [il-minaret-32.51978-35.22098] | minaret [il-minaret-32.51978-35.22098] → minaret [il-minaret-32.51978-35.22098] → minaret [il-minaret-32.51978-35.22098] → minaret [il-minaret-32.51978-35.22098] |
| רם און (il-32.5272-35.2590) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זובובא (il-32.5441-35.2234) | flat | minaret [il-minaret-32.54583-35.22416] → minaret [il-minaret-32.54583-35.22416] → minaret [il-minaret-32.54583-35.22416] → minaret [il-minaret-32.54583-35.22416] | minaret [il-minaret-32.54583-35.22416] → minaret [il-minaret-32.54583-35.22416] → minaret [il-minaret-32.54583-35.22416] → minaret [il-minaret-32.54583-35.22416] |
| ברק (il-32.5425-35.2654) | flat | synagogue [il-synagogue-32.54249-35.26482] → synagogue [il-synagogue-32.54249-35.26482] → synagogue [il-synagogue-32.54249-35.26482] → synagogue [il-synagogue-32.54249-35.26482] | synagogue [il-synagogue-32.54249-35.26482] → synagogue [il-synagogue-32.54249-35.26482] → synagogue [il-synagogue-32.54249-35.26482] → synagogue [il-synagogue-32.54249-35.26482] |
| חבר (il-32.5479-35.2644) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אדירים (il-32.5491-35.2712) | flat | synagogue [il-synagogue-32.54879-35.27098] → synagogue [il-synagogue-32.54879-35.27098] → synagogue [il-synagogue-32.54879-35.27098] → synagogue [il-synagogue-32.54879-35.27098] | synagogue [il-synagogue-32.54879-35.27098] → synagogue [il-synagogue-32.54879-35.27098] → synagogue [il-synagogue-32.54879-35.27098] → synagogue [il-synagogue-32.54879-35.27098] |
| דבורה (il-32.5531-35.2635) | flat | synagogue [il-synagogue-32.55251-35.26429] → synagogue [il-synagogue-32.55251-35.26429] → synagogue [il-synagogue-32.55251-35.26429] → synagogue [il-synagogue-32.55251-35.26429] | synagogue [il-synagogue-32.55251-35.26429] → synagogue [il-synagogue-32.55251-35.26429] → synagogue [il-synagogue-32.55251-35.26429] → synagogue [il-synagogue-32.55251-35.26429] |
| מיטב (il-32.5457-35.3013) | flat | synagogue [il-synagogue-32.54525-35.30045] → synagogue [il-synagogue-32.54525-35.30045] → synagogue [il-synagogue-32.54502-35.31146]; synagogue [il-synagogue-32.54525-35.30045] → synagogue [il-synagogue-32.54502-35.31146]; synagogue [il-synagogue-32.54525-35.30045] | synagogue [il-synagogue-32.54525-35.30045] → synagogue [il-synagogue-32.54525-35.30045] → synagogue [il-synagogue-32.54502-35.31146]; synagogue [il-synagogue-32.54525-35.30045] → synagogue [il-synagogue-32.54502-35.31146]; synagogue [il-synagogue-32.54525-35.30045] |
| פרזון (il-32.5454-35.3112) | flat | synagogue [il-synagogue-32.54502-35.31146] → synagogue [il-synagogue-32.54502-35.31146] → synagogue [il-synagogue-32.54502-35.31146] → synagogue [il-synagogue-32.54502-35.31146] | synagogue [il-synagogue-32.54502-35.31146] → synagogue [il-synagogue-32.54502-35.31146] → synagogue [il-synagogue-32.54502-35.31146] → synagogue [il-synagogue-32.54502-35.31146] |
| יעל (il-32.5519-35.3079) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אביטל (il-32.5579-35.3064) | flat | synagogue [il-synagogue-32.55773-35.30727] → synagogue [il-synagogue-32.55773-35.30727] → synagogue [il-synagogue-32.55773-35.30727] → synagogue [il-synagogue-32.55773-35.30727] | synagogue [il-synagogue-32.55773-35.30727] → synagogue [il-synagogue-32.55773-35.30727] → synagogue [il-synagogue-32.55773-35.30727] → synagogue [il-synagogue-32.55773-35.30727] |
| גדיש (il-32.5588-35.2449) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אומן (il-32.5641-35.2422) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מלאה (il-32.5635-35.2360) | flat | synagogue [il-synagogue-32.56284-35.23731] → synagogue [il-synagogue-32.56284-35.23731] → synagogue [il-synagogue-32.56284-35.23731] → synagogue [il-synagogue-32.56284-35.23731] | synagogue [il-synagogue-32.56284-35.23731] → synagogue [il-synagogue-32.56284-35.23731] → synagogue [il-synagogue-32.56284-35.23731] → synagogue [il-synagogue-32.56284-35.23731] |
| ניר יפה (il-32.5696-35.2453) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עפולה (il-32.6076-35.2891) | flat | church [il-church-32.63064-35.35011] → 0 → 0 → 0 | church [il-church-32.63064-35.35011] → 0 → 0 → 0 |
| ג'למה (il-32.5085-35.3133) | flat | minaret [il-minaret-32.50873-35.31401] → minaret [il-minaret-32.50873-35.31401] → minaret [il-minaret-32.50873-35.31401] → minaret [il-minaret-32.50873-35.31401] | minaret [il-minaret-32.50873-35.31401] → minaret [il-minaret-32.50873-35.31401] → minaret [il-minaret-32.50873-35.31401] → minaret [il-minaret-32.50873-35.31401] |
| ערבונה (il-32.5111-35.3639) | flat | minaret [il-minaret-32.51176-35.36426] → minaret [il-minaret-32.51176-35.36426] → minaret [il-minaret-32.51176-35.36426] → minaret [il-minaret-32.51176-35.36426] | minaret [il-minaret-32.51176-35.36426] → minaret [il-minaret-32.51176-35.36426] → minaret [il-minaret-32.51176-35.36426] → minaret [il-minaret-32.51176-35.36426] |
| מגן שאול (il-32.5207-35.3067) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סנדלה (il-32.5231-35.3238) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גן נר (il-32.5309-35.3391) | flat | minaret [il-minaret-32.51432-35.29485]; synagogue [il-synagogue-32.52787-35.33524] → synagogue [il-synagogue-32.52787-35.33524] → synagogue [il-synagogue-32.52787-35.33524] → synagogue [il-synagogue-32.52787-35.33524] | minaret [il-minaret-32.51432-35.29485]; synagogue [il-synagogue-32.52787-35.33524] → synagogue [il-synagogue-32.52787-35.33524] → synagogue [il-synagogue-32.52787-35.33524] → synagogue [il-synagogue-32.52787-35.33524] |
| נורית (il-32.5427-35.3560) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גדעונה (il-32.5487-35.3593) | flat | synagogue [il-synagogue-32.54929-35.35863] → synagogue [il-synagogue-32.54929-35.35863] → synagogue [il-synagogue-32.54929-35.35863] → synagogue [il-synagogue-32.54929-35.35863] | synagogue [il-synagogue-32.54929-35.35863] → synagogue [il-synagogue-32.54929-35.35863] → synagogue [il-synagogue-32.54929-35.35863] → synagogue [il-synagogue-32.54929-35.35863] |
| תל יוסף (il-32.5561-35.3997) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין חרוד (il-32.5592-35.3936) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יזרעאל (il-32.5624-35.3213) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר יחזקאל (il-32.5683-35.3624) | flat | synagogue [il-synagogue-32.56818-35.36077] → synagogue [il-synagogue-32.56818-35.36077] → synagogue [il-synagogue-32.56818-35.36077] → synagogue [il-synagogue-32.56818-35.36077] | synagogue [il-synagogue-32.56818-35.36077] → synagogue [il-synagogue-32.56818-35.36077] → synagogue [il-synagogue-32.56818-35.36077] → synagogue [il-synagogue-32.56818-35.36077] |
| גבע (il-32.5663-35.3715) | flat | 0 → synagogue [il-synagogue-32.54929-35.35863] → synagogue [il-synagogue-32.54929-35.35863] → 0 | 0 → synagogue [il-synagogue-32.54929-35.35863] → synagogue [il-synagogue-32.54929-35.35863] → 0 |
| מושב מרחביה (il-32.6024-35.3160) | flat | synagogue [il-synagogue-32.60355-35.31678] → synagogue [il-synagogue-32.60355-35.31678] → synagogue [il-synagogue-32.60355-35.31678] → synagogue [il-synagogue-32.60355-35.31678] | synagogue [il-synagogue-32.60355-35.31678] → synagogue [il-synagogue-32.60355-35.31678] → synagogue [il-synagogue-32.60355-35.31678] → synagogue [il-synagogue-32.60355-35.31678] |
| קיבוץ מרחביה (il-32.6052-35.3077) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ניר דוד (il-32.5027-35.4567) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית אלפא (il-32.5160-35.4313) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חפציבה (il-32.5182-35.4258) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה נחום (il-32.5271-35.4816) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית השיטה (il-32.5511-35.4382) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מולדת (il-32.5861-35.4401) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמת צבי (il-32.5915-35.4145) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חמדיה (il-32.5201-35.5204) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית יוסף (il-32.5588-35.5523) | flat | synagogue [il-synagogue-32.55863-35.55087] → synagogue [il-synagogue-32.55863-35.55087] → synagogue [il-synagogue-32.55863-35.55087] → synagogue [il-synagogue-32.55863-35.55087] | synagogue [il-synagogue-32.55863-35.55087] → synagogue [il-synagogue-32.55863-35.55087] → synagogue [il-synagogue-32.55863-35.55087] → synagogue [il-synagogue-32.55863-35.55087] |
| ירדנה (il-32.5644-35.5646) | flat | synagogue [il-synagogue-32.56544-35.56487] → synagogue [il-synagogue-32.56544-35.56487] → synagogue [il-synagogue-32.56544-35.56487] → synagogue [il-synagogue-32.56544-35.56487] | synagogue [il-synagogue-32.56544-35.56487] → synagogue [il-synagogue-32.56544-35.56487] → synagogue [il-synagogue-32.56544-35.56487] → synagogue [il-synagogue-32.56544-35.56487] |
| נווה אור (il-32.5887-35.5532) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דור (il-32.6076-34.9231) | flat | minaret [il-minaret-32.6092-34.91712] → minaret [il-minaret-32.6092-34.91712] → minaret [il-minaret-32.6092-34.91712] → minaret [il-minaret-32.6092-34.91712] | minaret [il-minaret-32.6092-34.91712] → minaret [il-minaret-32.6092-34.91712] → minaret [il-minaret-32.6092-34.91712] → minaret [il-minaret-32.6092-34.91712] |
| נחשולים (il-32.6138-34.9206) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עופר (il-32.6221-34.9828) | flat | synagogue [il-synagogue-32.57398-34.95381]; synagogue [il-synagogue-32.62166-34.98111] → synagogue [il-synagogue-32.62166-34.98111] → synagogue [il-synagogue-32.62166-34.98111] → synagogue [il-synagogue-32.62166-34.98111] | synagogue [il-synagogue-32.57398-34.95381]; synagogue [il-synagogue-32.62166-34.98111] → synagogue [il-synagogue-32.62166-34.98111] → synagogue [il-synagogue-32.62166-34.98111] → synagogue [il-synagogue-32.62166-34.98111] |
| עין איילה (il-32.6287-34.9454) | flat | synagogue [il-synagogue-32.62927-34.94458] → synagogue [il-synagogue-32.62927-34.94458] → synagogue [il-synagogue-32.62927-34.94458] → synagogue [il-synagogue-32.62927-34.94458] | synagogue [il-synagogue-32.62927-34.94458] → synagogue [il-synagogue-32.62927-34.94458] → synagogue [il-synagogue-32.62927-34.94458] → synagogue [il-synagogue-32.62927-34.94458] |
| הבונים (il-32.6372-34.9328) | flat | synagogue [il-synagogue-32.60689-34.92303] → 0 → 0 → 0 | synagogue [il-synagogue-32.60689-34.92303] → 0 → 0 → 0 |
| כרם מהר"ל (il-32.6461-34.9900) | flat | minaret [il-minaret-32.64525-34.98887]; synagogue [il-synagogue-32.6443-34.99168] → minaret [il-minaret-32.64525-34.98887]; synagogue [il-synagogue-32.6443-34.99168] → minaret [il-minaret-32.64525-34.98887]; synagogue [il-synagogue-32.6443-34.99168] → minaret [il-minaret-32.64525-34.98887]; synagogue [il-synagogue-32.6443-34.99168] | minaret [il-minaret-32.64525-34.98887]; synagogue [il-synagogue-32.6443-34.99168] → minaret [il-minaret-32.64525-34.98887]; synagogue [il-synagogue-32.6443-34.99168] → minaret [il-minaret-32.64525-34.98887]; synagogue [il-synagogue-32.6443-34.99168] → minaret [il-minaret-32.64525-34.98887]; synagogue [il-synagogue-32.6443-34.99168] |
| צרופה (il-32.6482-34.9481) | flat | synagogue [il-synagogue-32.64874-34.94766] → synagogue [il-synagogue-32.64874-34.94766] → synagogue [il-synagogue-32.64874-34.94766] → synagogue [il-synagogue-32.64874-34.94766] | synagogue [il-synagogue-32.64874-34.94766] → synagogue [il-synagogue-32.64874-34.94766] → synagogue [il-synagogue-32.64874-34.94766] → synagogue [il-synagogue-32.64874-34.94766] |
| גבע כרמל (il-32.6636-34.9550) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין כרמל (il-32.6770-34.9531) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נווה ים (il-32.6792-34.9318) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עתלית (il-32.6907-34.9423) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין הוד (il-32.7005-34.9826) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ימין אורד (il-32.7017-34.9898) | flat | synagogue [il-synagogue-32.70227-34.98645] → synagogue [il-synagogue-32.70227-34.98645] → synagogue [il-synagogue-32.70227-34.98645] → synagogue [il-synagogue-32.70227-34.98645] | synagogue [il-synagogue-32.70227-34.98645] → synagogue [il-synagogue-32.70227-34.98645] → synagogue [il-synagogue-32.70227-34.98645] → synagogue [il-synagogue-32.70227-34.98645] |
| ניר עציון (il-32.6976-34.9936) | flat | synagogue [il-synagogue-32.69765-34.99046] → synagogue [il-synagogue-32.69765-34.99046] → synagogue [il-synagogue-32.69765-34.99046] → synagogue [il-synagogue-32.69765-34.99046] | synagogue [il-synagogue-32.69765-34.99046] → synagogue [il-synagogue-32.69765-34.99046] → synagogue [il-synagogue-32.69765-34.99046] → synagogue [il-synagogue-32.69765-34.99046] |
| רמת השופט (il-32.6120-35.0949) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין העמק (il-32.6290-35.0854) | flat | synagogue [il-synagogue-32.63099-35.0827] → synagogue [il-synagogue-32.63099-35.0827] → synagogue [il-synagogue-32.63099-35.0827] → synagogue [il-synagogue-32.63099-35.0827] | synagogue [il-synagogue-32.63099-35.0827] → synagogue [il-synagogue-32.63099-35.0827] → synagogue [il-synagogue-32.63099-35.0827] → synagogue [il-synagogue-32.63099-35.0827] |
| יוקנעם עילית (il-32.6481-35.0943) | flat | synagogue [il-synagogue-32.64395-35.09487]; synagogue [il-synagogue-32.64775-35.09389] → synagogue [il-synagogue-32.64395-35.09487]; synagogue [il-synagogue-32.64775-35.09389] → synagogue [il-synagogue-32.64395-35.09487]; synagogue [il-synagogue-32.64775-35.09389] → synagogue [il-synagogue-32.64395-35.09487]; synagogue [il-synagogue-32.64775-35.09389] | synagogue [il-synagogue-32.64395-35.09487]; synagogue [il-synagogue-32.64775-35.09389] → synagogue [il-synagogue-32.64395-35.09487]; synagogue [il-synagogue-32.64775-35.09389] → synagogue [il-synagogue-32.64395-35.09487]; synagogue [il-synagogue-32.64775-35.09389] → synagogue [il-synagogue-32.64395-35.09487]; synagogue [il-synagogue-32.64775-35.09389] |
| יוקנעם המושבה (il-32.6538-35.1148) | flat | synagogue [il-synagogue-32.65168-35.11398] → synagogue [il-synagogue-32.65168-35.11398] → synagogue [il-synagogue-32.65168-35.11398] → synagogue [il-synagogue-32.65168-35.11398] | synagogue [il-synagogue-32.65168-35.11398] → synagogue [il-synagogue-32.65168-35.11398] → synagogue [il-synagogue-32.65168-35.11398] → synagogue [il-synagogue-32.65168-35.11398] |
| דלית אל-כרמל (il-32.6922-35.0483) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עספיא (il-32.7152-35.0671) | flat | synagogue [il-synagogue-32.72573-35.0546] → synagogue [il-synagogue-32.72573-35.0546] → synagogue [il-synagogue-32.72573-35.0546] → synagogue [il-synagogue-32.72573-35.0546] | synagogue [il-synagogue-32.72573-35.0546] → synagogue [il-synagogue-32.72573-35.0546] → synagogue [il-synagogue-32.72573-35.0546] → synagogue [il-synagogue-32.72573-35.0546] |
| כפר תקווה (il-32.7014-35.1145) | flat | synagogue [il-synagogue-32.69262-35.10841]; synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.69262-35.10841]; synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.69262-35.10841]; synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.69262-35.10841]; synagogue [il-synagogue-32.71016-35.11556] | synagogue [il-synagogue-32.69262-35.10841]; synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.69262-35.10841]; synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.69262-35.10841]; synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.69262-35.10841]; synagogue [il-synagogue-32.71016-35.11556] |
| קריית טבעון (il-32.7161-35.1268) | flat | synagogue [il-synagogue-32.71235-35.12244] → synagogue [il-synagogue-32.71235-35.12244] → synagogue [il-synagogue-32.71235-35.12244] → synagogue [il-synagogue-32.71235-35.12244] | synagogue [il-synagogue-32.71235-35.12244] → synagogue [il-synagogue-32.71235-35.12244] → synagogue [il-synagogue-32.71235-35.12244] → synagogue [il-synagogue-32.71235-35.12244] |
| שער העמקים (il-32.7231-35.1131) | flat | synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.71016-35.11556] | synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.71016-35.11556] → synagogue [il-synagogue-32.71016-35.11556] |
| בית זייד (il-32.7022-35.1313) | flat | synagogue [il-synagogue-32.70545-35.12419] → synagogue [il-synagogue-32.70545-35.12419] → synagogue [il-synagogue-32.70545-35.12419] → synagogue [il-synagogue-32.70545-35.12419] | synagogue [il-synagogue-32.70545-35.12419] → synagogue [il-synagogue-32.70545-35.12419] → synagogue [il-synagogue-32.70545-35.12419] → synagogue [il-synagogue-32.70545-35.12419] |
| אלונים (il-32.7199-35.1447) | flat | synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] | synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] |
| רמת הדסה (il-32.7292-35.1461) | flat | synagogue [il-synagogue-32.72072-35.13473]; synagogue [il-synagogue-32.77697-35.02077] → synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] | synagogue [il-synagogue-32.72072-35.13473]; synagogue [il-synagogue-32.77697-35.02077] → synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] → synagogue [il-synagogue-32.72072-35.13473] |
| שדה יעקב (il-32.6974-35.1418) | flat | minaret [il-minaret-32.70347-35.29766]; synagogue [il-synagogue-32.69724-35.14113] → synagogue [il-synagogue-32.69724-35.14113] → synagogue [il-synagogue-32.69724-35.14113] → synagogue [il-synagogue-32.69724-35.14113] | minaret [il-minaret-32.70347-35.29766]; synagogue [il-synagogue-32.69724-35.14113] → synagogue [il-synagogue-32.69724-35.14113] → synagogue [il-synagogue-32.69724-35.14113] → synagogue [il-synagogue-32.69724-35.14113] |
| נווה עמיאל (il-32.7022-35.1374) | flat | minaret [il-minaret-32.70347-35.29766] → 0 → synagogue [il-synagogue-32.70341-35.15822] → 0 | minaret [il-minaret-32.70347-35.29766] → 0 → synagogue [il-synagogue-32.70341-35.15822] → synagogue [il-synagogue-32.70341-35.15822] |
| רמת ישי (il-32.7025-35.1652) | flat | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 |
| בית שערים (il-32.6962-35.1795) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| היוגב (il-32.6114-35.2057) | flat | synagogue [il-synagogue-32.61292-35.20613] → synagogue [il-synagogue-32.61292-35.20613] → synagogue [il-synagogue-32.61292-35.20613] → synagogue [il-synagogue-32.61292-35.20613] | synagogue [il-synagogue-32.61292-35.20613] → synagogue [il-synagogue-32.61292-35.20613] → synagogue [il-synagogue-32.61292-35.20613] → synagogue [il-synagogue-32.61292-35.20613] |
| כפר גדעון (il-32.6430-35.2916) | flat | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.64418-35.29022] → synagogue [il-synagogue-32.64418-35.29022] → synagogue [il-synagogue-32.64418-35.29022] → synagogue [il-synagogue-32.64418-35.29022] | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.64418-35.29022] → synagogue [il-synagogue-32.64418-35.29022] → synagogue [il-synagogue-32.64418-35.29022] → synagogue [il-synagogue-32.64418-35.29022] |
| מזרע (il-32.6510-35.2861) | flat | church [il-church-32.63064-35.35011]; church [il-church-32.68626-35.39242] → 0 → 0 → 0 | church [il-church-32.63064-35.35011]; church [il-church-32.68626-35.39242] → 0 → 0 → 0 |
| מגדל העמק (il-32.6766-35.2413) | flat | synagogue [il-synagogue-32.67418-35.24273] → synagogue [il-synagogue-32.67418-35.24273] → synagogue [il-synagogue-32.67418-35.24273] → synagogue [il-synagogue-32.67418-35.24273] | synagogue [il-synagogue-32.67418-35.24273] → synagogue [il-synagogue-32.67418-35.24273] → synagogue [il-synagogue-32.67418-35.24273] → synagogue [il-synagogue-32.67418-35.24273] |
| יפעת (il-32.6772-35.2239) | flat | minaret [il-minaret-32.70347-35.29766] → 0 → synagogue [il-synagogue-32.67418-35.24273] → synagogue [il-synagogue-32.67418-35.24273] | minaret [il-minaret-32.70347-35.29766] → 0 → synagogue [il-synagogue-32.67418-35.24273] → synagogue [il-synagogue-32.67418-35.24273] |
| גניגר (il-32.6643-35.2569) | flat | church [il-church-32.68626-35.39242] → 0 → 0 → 0 | church [il-church-32.68626-35.39242] → 0 → 0 → 0 |
| גבת (il-32.6747-35.2108) | flat | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 |
| יפיע נצרת (il-32.6866-35.2772) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נצרת (il-32.7066-35.3049) | flat | church [il-church-32.69674-35.28574]; minaret [il-minaret-32.70347-35.29766] → church [il-church-32.69674-35.28574]; minaret [il-minaret-32.70347-35.29766] → church [il-church-32.69674-35.28574]; minaret [il-minaret-32.70347-35.29766] → church [il-church-32.69674-35.28574]; minaret [il-minaret-32.70347-35.29766] | church [il-church-32.69674-35.28574]; minaret [il-minaret-32.70347-35.29766] → church [il-church-32.69674-35.28574]; minaret [il-minaret-32.70347-35.29766] → church [il-church-32.69674-35.28574]; minaret [il-minaret-32.70347-35.29766] → church [il-church-32.69674-35.28574]; minaret [il-minaret-32.70347-35.29766] |
| ריינה (il-32.7236-35.3125) | flat | minaret [il-minaret-32.72382-35.35074] → 0 → 0 → 0 | minaret [il-minaret-32.72382-35.35074] → 0 → synagogue [il-synagogue-32.72996-35.33316] → 0 |
| נוף הגליל (il-32.7023-35.3183) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משהד (il-32.7402-35.3245) | flat | church [il-church-32.70705-35.30171]; minaret [il-minaret-32.72382-35.35074]; synagogue [il-synagogue-32.72996-35.33316] → 0 → 0 → 0 | church [il-church-32.70705-35.30171]; minaret [il-minaret-32.72382-35.35074]; synagogue [il-synagogue-32.72996-35.33316] → 0 → 0 → 0 |
| עין מאהל (il-32.7233-35.3527) | flat | 0 → 0 → synagogue [il-synagogue-32.72996-35.33316] → 0 | 0 → 0 → synagogue [il-synagogue-32.72996-35.33316] → 0 |
| כפר החורש (il-32.7013-35.2742) | flat | church [il-church-32.69674-35.28574] → 0 → 0 → 0 | church [il-church-32.69674-35.28574] → 0 → church [il-church-32.70429-35.29499]; church [il-church-32.70705-35.30171] → minaret [il-minaret-32.70347-35.29766] |
| נעורה (il-32.6140-35.3903) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דחי (il-32.6204-35.3450) | flat | minaret [il-minaret-32.62056-35.34589] → minaret [il-minaret-32.62056-35.34589] → minaret [il-minaret-32.62056-35.34589] → minaret [il-minaret-32.62056-35.34589] | minaret [il-minaret-32.62056-35.34589] → minaret [il-minaret-32.62056-35.34589] → minaret [il-minaret-32.62056-35.34589] → minaret [il-minaret-32.62056-35.34589] |
| ניין (il-32.6307-35.3489) | flat | church [il-church-32.63064-35.35011] → church [il-church-32.63064-35.35011] → church [il-church-32.63064-35.35011] → church [il-church-32.63064-35.35011] | church [il-church-32.63064-35.35011] → church [il-church-32.63064-35.35011] → church [il-church-32.63064-35.35011] → church [il-church-32.63064-35.35011] |
| דברת (il-32.6479-35.3505) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אחוזת ברק (il-32.6418-35.3387) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| איכסל (il-32.6816-35.3240) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שבלי - אום אל-גנם (il-32.6758-35.3919) | flat | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 |
| דבוריה (il-32.6928-35.3716) | flat | minaret [il-minaret-32.69289-35.37003]; minaret [il-minaret-32.70347-35.29766] → minaret [il-minaret-32.69289-35.37003] → minaret [il-minaret-32.69289-35.37003] → minaret [il-minaret-32.69289-35.37003] | minaret [il-minaret-32.69289-35.37003]; minaret [il-minaret-32.70347-35.29766] → minaret [il-minaret-32.69289-35.37003] → minaret [il-minaret-32.69289-35.37003] → minaret [il-minaret-32.69289-35.37003] |
| שיבלי (il-32.6937-35.3960) | flat | church [il-church-32.68626-35.39242]; minaret [il-minaret-32.70831-35.29523] → church [il-church-32.68626-35.39242] → church [il-church-32.68626-35.39242] → church [il-church-32.68626-35.39242] | church [il-church-32.68626-35.39242]; minaret [il-minaret-32.70831-35.29523] → church [il-church-32.68626-35.39242] → church [il-church-32.68626-35.39242] → church [il-church-32.68626-35.39242] |
| טמרה (il-32.6343-35.4042) | flat | minaret [il-minaret-32.63518-35.40319] → minaret [il-minaret-32.63518-35.40319] → minaret [il-minaret-32.63518-35.40319] → minaret [il-minaret-32.63518-35.40319] | minaret [il-minaret-32.63518-35.40319] → minaret [il-minaret-32.63518-35.40319] → minaret [il-minaret-32.63518-35.40319] → minaret [il-minaret-32.63518-35.40319] |
| כפר מיסר (il-32.6452-35.4229) | flat | church [il-church-32.63064-35.35011]; minaret [il-minaret-32.64527-35.42257] → minaret [il-minaret-32.64527-35.42257] → minaret [il-minaret-32.64527-35.42257] → minaret [il-minaret-32.64527-35.42257] | church [il-church-32.63064-35.35011]; minaret [il-minaret-32.64527-35.42257] → minaret [il-minaret-32.64527-35.42257] → minaret [il-minaret-32.64527-35.42257] → minaret [il-minaret-32.64527-35.42257] |
| עין דור (il-32.6563-35.4170) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר קיש (il-32.6664-35.4488) | flat | synagogue [il-synagogue-32.66726-35.44819] → synagogue [il-synagogue-32.66726-35.44819] → synagogue [il-synagogue-32.66726-35.44819] → synagogue [il-synagogue-32.66726-35.44819] | synagogue [il-synagogue-32.66726-35.44819] → synagogue [il-synagogue-32.66726-35.44819] → synagogue [il-synagogue-32.66726-35.44819] → synagogue [il-synagogue-32.66726-35.44819] |
| כפר תבור (il-32.6878-35.4204) | flat | minaret [il-minaret-32.70347-35.29766]; synagogue [il-synagogue-32.68736-35.41732]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.68736-35.41732] → synagogue [il-synagogue-32.68736-35.41732] → synagogue [il-synagogue-32.68736-35.41732] | minaret [il-minaret-32.70347-35.29766]; synagogue [il-synagogue-32.68736-35.41732]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.68736-35.41732] → synagogue [il-synagogue-32.68736-35.41732] → synagogue [il-synagogue-32.68736-35.41732] |
| שדמות דבורה (il-32.6955-35.4374) | flat | minaret [il-minaret-32.70347-35.29766]; synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 | minaret [il-minaret-32.70347-35.29766]; synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 |
| כדורי (il-32.7039-35.4067) | flat | minaret [il-minaret-32.70347-35.29766]; synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 | minaret [il-minaret-32.70347-35.29766]; synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 |
| גשר (il-32.6206-35.5521) | flat | church [il-church-32.68626-35.39242] → 0 → 0 → 0 | church [il-church-32.68626-35.39242] → 0 → 0 → 0 |
| الباقورة (il-32.6420-35.5910) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אשדות יעקב איחוד (il-32.6582-35.5811) | flat | synagogue [il-synagogue-32.65845-35.58287] → synagogue [il-synagogue-32.65845-35.58287] → synagogue [il-synagogue-32.65845-35.58287] → synagogue [il-synagogue-32.65845-35.58287] | synagogue [il-synagogue-32.65845-35.58287] → synagogue [il-synagogue-32.65845-35.58287] → synagogue [il-synagogue-32.65845-35.58287] → synagogue [il-synagogue-32.65845-35.58287] |
| אשדות יעקב מאוחד (il-32.6621-35.5820) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מנחמיה (il-32.6670-35.5556) | flat | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.66372-35.5525] → synagogue [il-synagogue-32.66372-35.5525] → synagogue [il-synagogue-32.66372-35.5525] → synagogue [il-synagogue-32.66372-35.5525] | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.66372-35.5525] → synagogue [il-synagogue-32.66372-35.5525] → synagogue [il-synagogue-32.66372-35.5525] → synagogue [il-synagogue-32.66372-35.5525] |
| אפיקים (il-32.6814-35.5783) | flat | synagogue [il-synagogue-32.68061-35.5805]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.68061-35.5805] → synagogue [il-synagogue-32.68061-35.5805] → synagogue [il-synagogue-32.68061-35.5805] | synagogue [il-synagogue-32.68061-35.5805]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.68061-35.5805] → synagogue [il-synagogue-32.68061-35.5805] → synagogue [il-synagogue-32.68061-35.5805] |
| בית זרע (il-32.6883-35.5734) | flat | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 |
| מסדה (il-32.6831-35.5988) | flat | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 |
| שער הגולן (il-32.6858-35.6043) | flat | synagogue [il-synagogue-32.68465-35.60454]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.68465-35.60454] → synagogue [il-synagogue-32.68465-35.60454] → synagogue [il-synagogue-32.68465-35.60454] | synagogue [il-synagogue-32.68465-35.60454]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.68465-35.60454] → synagogue [il-synagogue-32.68465-35.60454] → synagogue [il-synagogue-32.68465-35.60454] |
| יבנאל (il-32.7055-35.5053) | flat | church [il-church-32.74695-35.33865]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.70302-35.50359] | church [il-church-32.74695-35.33865]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.70302-35.50359] |
| דגניה ב' (il-32.6999-35.5747) | flat | synagogue [il-synagogue-32.7016-35.57525]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.7016-35.57525] → synagogue [il-synagogue-32.7016-35.57525] → synagogue [il-synagogue-32.7016-35.57525] | synagogue [il-synagogue-32.7016-35.57525]; synagogue [il-synagogue-32.70302-35.50359] → synagogue [il-synagogue-32.7016-35.57525] → synagogue [il-synagogue-32.7016-35.57525] → synagogue [il-synagogue-32.7016-35.57525] |
| דגניה א' (il-32.7085-35.5749) | flat | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 |
| כנרת מושבה (il-32.7232-35.5644) | flat | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.70302-35.50359]; synagogue [il-synagogue-32.72285-35.56815] → synagogue [il-synagogue-32.72285-35.56815] → synagogue [il-synagogue-32.72285-35.56815] → synagogue [il-synagogue-32.72285-35.56815] | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.70302-35.50359]; synagogue [il-synagogue-32.72285-35.56815] → synagogue [il-synagogue-32.72285-35.56815] → synagogue [il-synagogue-32.72285-35.56815] → synagogue [il-synagogue-32.72285-35.56815] |
| קבוצת כנרת (il-32.7139-35.5625) | flat | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.71483-35.56341] → synagogue [il-synagogue-32.71483-35.56341] → synagogue [il-synagogue-32.71483-35.56341] → synagogue [il-synagogue-32.71483-35.56341] | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.71483-35.56341] → synagogue [il-synagogue-32.71483-35.56341] → synagogue [il-synagogue-32.71483-35.56341] → synagogue [il-synagogue-32.71483-35.56341] |
| מעגן (il-32.7067-35.6011) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-עדסייה (il-32.6667-35.6239) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-מוח'ייבה א-תחתא (il-32.6730-35.6754) | flat | minaret [il-minaret-32.67481-35.67909] → minaret [il-minaret-32.67481-35.67909] → minaret [il-minaret-32.67481-35.67909] → minaret [il-minaret-32.67481-35.67909] | minaret [il-minaret-32.67481-35.67909] → minaret [il-minaret-32.67481-35.67909] → minaret [il-minaret-32.67481-35.67909] → minaret [il-minaret-32.67481-35.67909] |
| الحمة الأردنية (il-32.7013-35.6820) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מגדים (il-32.7290-34.9620) | flat | synagogue [il-synagogue-32.73248-34.95797] → synagogue [il-synagogue-32.73248-34.95797] → synagogue [il-synagogue-32.73248-34.95797] → synagogue [il-synagogue-32.73248-34.95797] | synagogue [il-synagogue-32.73248-34.95797] → synagogue [il-synagogue-32.73248-34.95797] → synagogue [il-synagogue-32.73248-34.95797] → synagogue [il-synagogue-32.73248-34.95797] |
| בית אורן (il-32.7306-35.0056) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| החותרים (il-32.7515-34.9568) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טירת כרמל (il-32.7614-34.9716) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר גלים (il-32.7666-34.9593) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נשר (il-32.7709-35.0381) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קריית מוצקין (il-32.8364-35.0752) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קריית ים (il-32.8502-35.0703) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קריית ביאליק (il-32.8286-35.0845) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר ביאליק (il-32.8204-35.0869) | flat | 0 → synagogue [il-synagogue-32.81244-35.10151] → synagogue [il-synagogue-32.81244-35.10151] → synagogue [il-synagogue-32.81244-35.10151] | 0 → synagogue [il-synagogue-32.81244-35.10151] → synagogue [il-synagogue-32.81244-35.10151] → synagogue [il-synagogue-32.81244-35.10151] |
| כפר מסריק (il-32.8911-35.1001) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין המפרץ (il-32.9036-35.0961) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יגור (il-32.7429-35.0781) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר הנוער הדתי (il-32.7427-35.1014) | flat | synagogue [il-synagogue-32.77697-35.02077] → 0 → 0 → 0 | synagogue [il-synagogue-32.77697-35.02077] → 0 → 0 → 0 |
| רכסים (il-32.7510-35.1014) | flat | synagogue [il-synagogue-32.77697-35.02077] → 0 → 0 → 0 | synagogue [il-synagogue-32.77697-35.02077] → 0 → 0 → 0 |
| כפר חסידים (il-32.7520-35.0936) | flat | synagogue [il-synagogue-32.77697-35.02077] → 0 → synagogue [il-synagogue-32.75513-35.10534] → 0 | synagogue [il-synagogue-32.77697-35.02077] → 0 → synagogue [il-synagogue-32.75513-35.10534] → 0 |
| קרית אתא (il-32.8116-35.1164) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אושה (il-32.7955-35.1144) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר המכבי (il-32.7911-35.1149) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמת יוחנן (il-32.7925-35.1214) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מנשייה זבדה (il-32.7061-35.1922) | flat | minaret [il-minaret-32.70347-35.29766]; minaret [il-minaret-32.70646-35.19317] → minaret [il-minaret-32.70646-35.19317] → minaret [il-minaret-32.70646-35.19317]; synagogue [il-synagogue-32.70341-35.15822] → minaret [il-minaret-32.70646-35.19317] | minaret [il-minaret-32.70347-35.29766]; minaret [il-minaret-32.70646-35.19317] → minaret [il-minaret-32.70646-35.19317] → minaret [il-minaret-32.70646-35.19317]; synagogue [il-synagogue-32.70341-35.15822] → minaret [il-minaret-32.70646-35.19317] |
| בית לחם הגלילית (il-32.7346-35.1891) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| זבידאת (il-32.7325-35.1332) | flat | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 |
| בסמת טבעון (il-32.7362-35.1546) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משאיח א סעדיה (il-32.7422-35.1585) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כעביה טבאש חג'אג'רה (il-32.7488-35.1841) | flat | minaret [il-minaret-32.7471-35.18298] → minaret [il-minaret-32.7471-35.18298] → minaret [il-minaret-32.7471-35.18298] → minaret [il-minaret-32.7471-35.18298] | minaret [il-minaret-32.7471-35.18298] → minaret [il-minaret-32.7471-35.18298] → minaret [il-minaret-32.7471-35.18298] → minaret [il-minaret-32.7471-35.18298] |
| נופית (il-32.7586-35.1474) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| הרדוף (il-32.7641-35.1728) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חוואלד (il-32.7708-35.1360) | flat | minaret [il-minaret-32.76892-35.13597] → minaret [il-minaret-32.76892-35.13597] → minaret [il-minaret-32.76892-35.13597] → minaret [il-minaret-32.76892-35.13597] | minaret [il-minaret-32.76892-35.13597] → minaret [il-minaret-32.76892-35.13597] → minaret [il-minaret-32.76892-35.13597] → minaret [il-minaret-32.76892-35.13597] |
| שפרעם (il-32.8046-35.1724) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עדי (il-32.7819-35.1736) | flat | synagogue [il-synagogue-32.78351-35.16915] → synagogue [il-synagogue-32.78351-35.16915] → synagogue [il-synagogue-32.78351-35.16915] → synagogue [il-synagogue-32.78351-35.16915] | synagogue [il-synagogue-32.78351-35.16915] → synagogue [il-synagogue-32.78351-35.16915] → synagogue [il-synagogue-32.78351-35.16915] → synagogue [il-synagogue-32.78351-35.16915] |
| עיבלין (il-32.8219-35.1922) | flat | minaret [il-minaret-32.82589-35.18817] → minaret [il-minaret-32.82589-35.18817] → minaret [il-minaret-32.82589-35.18817] → minaret [il-minaret-32.82589-35.18817] | minaret [il-minaret-32.82589-35.18817] → minaret [il-minaret-32.82589-35.18817] → minaret [il-minaret-32.82589-35.18817] → minaret [il-minaret-32.82589-35.18817] |
| ראס עלי (il-32.7721-35.1542) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת אלונים (il-32.8153-35.1393) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| תמרת (il-32.7038-35.2253) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עלוט (il-32.7164-35.2594) | flat | church [il-church-32.69674-35.28574]; minaret [il-minaret-32.68615-35.2707]; minaret [il-minaret-32.68954-35.27787]; minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] | church [il-church-32.69674-35.28574]; minaret [il-minaret-32.68615-35.2707]; minaret [il-minaret-32.68954-35.27787]; minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] |
| עלוט (il-32.7183-35.2613) | flat | church [il-church-32.69674-35.28574]; minaret [il-minaret-32.68615-35.2707]; minaret [il-minaret-32.68954-35.27787]; minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] | church [il-church-32.69674-35.28574]; minaret [il-minaret-32.68615-35.2707]; minaret [il-minaret-32.68954-35.27787]; minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] → minaret [il-minaret-32.71754-35.25952] |
| גבעת אלה (il-32.7229-35.2451) | flat | church [il-church-32.69674-35.28574] → 0 → 0 → 0 | church [il-church-32.69674-35.28574] → 0 → 0 → 0 |
| שמשית (il-32.7328-35.2472) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ציפורי (il-32.7443-35.2781) | flat | minaret [il-minaret-32.73903-35.32387] → 0 → 0 → 0 | minaret [il-minaret-32.73903-35.32387] → 0 → 0 → 0 |
| הושעיה (il-32.7586-35.2933) | flat | synagogue [il-synagogue-32.75883-35.29098] → synagogue [il-synagogue-32.75883-35.29098] → synagogue [il-synagogue-32.75883-35.29098] → synagogue [il-synagogue-32.75883-35.29098] | synagogue [il-synagogue-32.75883-35.29098] → synagogue [il-synagogue-32.75883-35.29098] → synagogue [il-synagogue-32.75883-35.29098] → synagogue [il-synagogue-32.75883-35.29098] |
| אלון הגליל (il-32.7573-35.2213) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ביר אל מכסור (il-32.7757-35.2217) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חנתון (il-32.7839-35.2453) | flat | synagogue [il-synagogue-32.78441-35.24454] → synagogue [il-synagogue-32.78441-35.24454] → synagogue [il-synagogue-32.78441-35.24454] → synagogue [il-synagogue-32.78441-35.24454] | synagogue [il-synagogue-32.78441-35.24454] → synagogue [il-synagogue-32.78441-35.24454] → synagogue [il-synagogue-32.78441-35.24454] → synagogue [il-synagogue-32.78441-35.24454] |
| מקמאן (il-32.7923-35.2249) | flat | minaret [il-minaret-32.79213-35.22286] → minaret [il-minaret-32.79213-35.22286] → minaret [il-minaret-32.79213-35.22286] → minaret [il-minaret-32.79213-35.22286] | minaret [il-minaret-32.79213-35.22286] → minaret [il-minaret-32.79213-35.22286] → minaret [il-minaret-32.79213-35.22286] → minaret [il-minaret-32.79213-35.22286] |
| בית קשת (il-32.7191-35.3943) | flat | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 | minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 |
| כפר כנא (il-32.7460-35.3398) | flat | church [il-church-32.74695-35.33865]; minaret [il-minaret-32.72382-35.35074] → church [il-church-32.74695-35.33865] → church [il-church-32.74695-35.33865] → church [il-church-32.74695-35.33865] | church [il-church-32.74695-35.33865]; minaret [il-minaret-32.72382-35.35074] → church [il-church-32.74695-35.33865] → church [il-church-32.74695-35.33865] → church [il-church-32.74695-35.33865] |
| בית רימון (il-32.7820-35.3278) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר כמא (il-32.7210-35.4408) | flat | minaret [il-minaret-32.70347-35.29766]; minaret [il-minaret-32.72178-35.44146]; synagogue [il-synagogue-32.70302-35.50359] → minaret [il-minaret-32.72178-35.44146] → minaret [il-minaret-32.72178-35.44146]; synagogue [il-synagogue-32.72549-35.46466] → minaret [il-minaret-32.72178-35.44146] | minaret [il-minaret-32.70347-35.29766]; minaret [il-minaret-32.72178-35.44146]; synagogue [il-synagogue-32.70302-35.50359] → minaret [il-minaret-32.72178-35.44146] → minaret [il-minaret-32.72178-35.44146]; synagogue [il-synagogue-32.72549-35.46466] → minaret [il-minaret-32.72178-35.44146] |
| שרונה (il-32.7255-35.4669) | flat | church [il-church-32.74695-35.33865]; minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 | church [il-church-32.74695-35.33865]; minaret [il-minaret-32.70347-35.29766] → 0 → 0 → 0 |
| הזורעים (il-32.7457-35.5032) | flat | church [il-church-32.74695-35.33865]; synagogue [il-synagogue-32.74579-35.50536] → synagogue [il-synagogue-32.74579-35.50536] → synagogue [il-synagogue-32.74579-35.50536] → synagogue [il-synagogue-32.74579-35.50536] | church [il-church-32.74695-35.33865]; synagogue [il-synagogue-32.74579-35.50536] → synagogue [il-synagogue-32.74579-35.50536] → synagogue [il-synagogue-32.74579-35.50536] → synagogue [il-synagogue-32.74579-35.50536] |
| אילניה (il-32.7550-35.4075) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גבעת אבני (il-32.7745-35.4384) | flat | synagogue [il-synagogue-32.77616-35.43775] → synagogue [il-synagogue-32.77616-35.43775] → synagogue [il-synagogue-32.77616-35.43775] → synagogue [il-synagogue-32.77616-35.43775] | synagogue [il-synagogue-32.77616-35.43775] → synagogue [il-synagogue-32.77616-35.43775] → synagogue [il-synagogue-32.77616-35.43775] → synagogue [il-synagogue-32.77616-35.43775] |
| מצפה (il-32.7903-35.5085) | flat | synagogue [il-synagogue-32.78196-35.50466] → synagogue [il-synagogue-32.78196-35.50466] → synagogue [il-synagogue-32.78196-35.50466] → synagogue [il-synagogue-32.78196-35.50466] | synagogue [il-synagogue-32.78196-35.50466] → synagogue [il-synagogue-32.78196-35.50466] → synagogue [il-synagogue-32.78196-35.50466] → synagogue [il-synagogue-32.78196-35.50466] |
| לביא (il-32.7872-35.4417) | flat | synagogue [il-synagogue-32.78642-35.44162] → synagogue [il-synagogue-32.78642-35.44162] → synagogue [il-synagogue-32.78642-35.44162] → synagogue [il-synagogue-32.78642-35.44162] | synagogue [il-synagogue-32.78642-35.44162] → synagogue [il-synagogue-32.78642-35.44162] → synagogue [il-synagogue-32.78642-35.44162] → synagogue [il-synagogue-32.78642-35.44162] |
| כפר חיטים (il-32.8006-35.5013) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אלומות (il-32.7070-35.5463) | flat | church [il-church-32.68626-35.39242] → synagogue [il-synagogue-32.7016-35.57525] → synagogue [il-synagogue-32.7016-35.57525] → 0 | church [il-church-32.68626-35.39242] → synagogue [il-synagogue-32.7016-35.57525] → synagogue [il-synagogue-32.7016-35.57525] → synagogue [il-synagogue-32.7016-35.57525] |
| פוריה כפר עבודה (il-32.7188-35.5474) | flat | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.72082-35.54515] → synagogue [il-synagogue-32.72082-35.54515] → synagogue [il-synagogue-32.72082-35.54515] → synagogue [il-synagogue-32.72082-35.54515] | church [il-church-32.68626-35.39242]; synagogue [il-synagogue-32.72082-35.54515] → synagogue [il-synagogue-32.72082-35.54515] → synagogue [il-synagogue-32.72082-35.54515] → synagogue [il-synagogue-32.72082-35.54515] |
| פוריה עילית (il-32.7322-35.5457) | flat | synagogue [il-synagogue-32.72853-35.54767] → synagogue [il-synagogue-32.72853-35.54767] → synagogue [il-synagogue-32.72853-35.54767] → synagogue [il-synagogue-32.72853-35.54767] | synagogue [il-synagogue-32.72853-35.54767] → synagogue [il-synagogue-32.72853-35.54767] → synagogue [il-synagogue-32.72853-35.54767] → synagogue [il-synagogue-32.72853-35.54767] |
| פוריה - נווה עובד (il-32.7437-35.5376) | flat | synagogue [il-synagogue-32.73867-35.53932] → synagogue [il-synagogue-32.73867-35.53932] → synagogue [il-synagogue-32.73867-35.53932] → synagogue [il-synagogue-32.73867-35.53932] | synagogue [il-synagogue-32.73867-35.53932] → synagogue [il-synagogue-32.73867-35.53932] → synagogue [il-synagogue-32.73867-35.53932] → synagogue [il-synagogue-32.73867-35.53932] |
| תל קציר (il-32.7052-35.6178) | flat | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 |
| האון (il-32.7270-35.6236) | flat | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 |
| מבוא חמה (il-32.7364-35.6556) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר חרוב (il-32.7632-35.6640) | flat | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 | synagogue [il-synagogue-32.70302-35.50359] → 0 → 0 → 0 |
| אפיק (il-32.7788-35.7013) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין גב (il-32.7811-35.6389) | flat | synagogue [il-synagogue-32.70302-35.50359]; synagogue [il-synagogue-32.78211-35.64025] → synagogue [il-synagogue-32.78211-35.64025] → synagogue [il-synagogue-32.78211-35.64025] → synagogue [il-synagogue-32.78211-35.64025] | synagogue [il-synagogue-32.70302-35.50359]; synagogue [il-synagogue-32.78211-35.64025] → synagogue [il-synagogue-32.78211-35.64025] → synagogue [il-synagogue-32.78211-35.64025] → synagogue [il-synagogue-32.78211-35.64025] |
| נאות גולן (il-32.7867-35.6930) | flat | synagogue [il-synagogue-32.78591-35.69355] → synagogue [il-synagogue-32.78591-35.69355] → synagogue [il-synagogue-32.78591-35.69355] → synagogue [il-synagogue-32.78591-35.69355] | synagogue [il-synagogue-32.78591-35.69355] → synagogue [il-synagogue-32.78591-35.69355] → synagogue [il-synagogue-32.78591-35.69355] → synagogue [il-synagogue-32.78591-35.69355] |
| גבעת יואב (il-32.7968-35.6813) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בני יהודה (il-32.7984-35.6902) | flat | synagogue [il-synagogue-32.79805-35.68838] → synagogue [il-synagogue-32.79805-35.68838] → synagogue [il-synagogue-32.79805-35.68838] → synagogue [il-synagogue-32.79805-35.68838] | synagogue [il-synagogue-32.79805-35.68838] → synagogue [il-synagogue-32.79805-35.68838] → synagogue [il-synagogue-32.79805-35.68838] → synagogue [il-synagogue-32.79805-35.68838] |
| מיצר (il-32.7687-35.7370) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אלי עד (il-32.8047-35.7342) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אפק (il-32.8402-35.1279) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מצפה אביב (il-32.8369-35.2021) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טמרה (il-32.8535-35.1979) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כאבול (il-32.8677-35.2101) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יסעור (il-32.9011-35.1664) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר מנדא (il-32.8114-35.2598) | flat | minaret [il-minaret-32.80953-35.26147] → minaret [il-minaret-32.80953-35.26147] → minaret [il-minaret-32.80953-35.26147] → minaret [il-minaret-32.80953-35.26147] | minaret [il-minaret-32.80953-35.26147] → minaret [il-minaret-32.80953-35.26147] → minaret [il-minaret-32.80953-35.26147] → minaret [il-minaret-32.80953-35.26147] |
| דמיידה (il-32.8155-35.2271) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מורשת (il-32.8255-35.2323) | flat | synagogue [il-synagogue-32.82579-35.23283] → synagogue [il-synagogue-32.82579-35.23283] → synagogue [il-synagogue-32.82579-35.23283] → synagogue [il-synagogue-32.82579-35.23283] | synagogue [il-synagogue-32.82579-35.23283] → synagogue [il-synagogue-32.82579-35.23283] → synagogue [il-synagogue-32.82579-35.23283] → synagogue [il-synagogue-32.82579-35.23283] |
| כאוכב אבו אל-היג'א (il-32.8309-35.2495) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יודפת (il-32.8372-35.2715) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קורנית (il-32.8436-35.2513) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שכניה (il-32.8487-35.2470) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| סכנין (il-32.8638-35.3023) | flat | minaret [il-minaret-32.86025-35.30509]; minaret [il-minaret-32.86343-35.29695] → minaret [il-minaret-32.86025-35.30509]; minaret [il-minaret-32.86343-35.29695] → minaret [il-minaret-32.86025-35.30509]; minaret [il-minaret-32.86343-35.29695] → minaret [il-minaret-32.86025-35.30509]; minaret [il-minaret-32.86343-35.29695] | minaret [il-minaret-32.86025-35.30509]; minaret [il-minaret-32.86343-35.29695] → minaret [il-minaret-32.86025-35.30509]; minaret [il-minaret-32.86343-35.29695] → minaret [il-minaret-32.86025-35.30509]; minaret [il-minaret-32.86343-35.29695] → minaret [il-minaret-32.86025-35.30509]; minaret [il-minaret-32.86343-35.29695] |
| רקפת (il-32.8547-35.2643) | flat | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 |
| עצמון שגב (il-32.8660-35.2512) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מנוף (il-32.8541-35.2368) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יעד (il-32.8783-35.2436) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שעב (il-32.8906-35.2384) | flat | minaret [il-minaret-32.88934-35.23613] → minaret [il-minaret-32.88934-35.23613] → minaret [il-minaret-32.88934-35.23613] → minaret [il-minaret-32.88934-35.23613] | minaret [il-minaret-32.88934-35.23613] → minaret [il-minaret-32.88934-35.23613] → minaret [il-minaret-32.88934-35.23613] → minaret [il-minaret-32.88934-35.23613] |
| יובלים (il-32.8775-35.2706) | flat | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 |
| ערב א-נעים (il-32.8876-35.2903) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אשחר (il-32.8851-35.3002) | flat | synagogue [il-synagogue-32.88459-35.30185] → synagogue [il-synagogue-32.88459-35.30185] → synagogue [il-synagogue-32.88459-35.30185] → synagogue [il-synagogue-32.88459-35.30185] | synagogue [il-synagogue-32.88459-35.30185] → synagogue [il-synagogue-32.88459-35.30185] → synagogue [il-synagogue-32.88459-35.30185] → synagogue [il-synagogue-32.88459-35.30185] |
| שורשים (il-32.8924-35.2579) | flat | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 |
| צורית (il-32.9023-35.2535) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גילון (il-32.9029-35.2355) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כרמיאל (il-32.9159-35.2934) | flat | synagogue [il-synagogue-32.91544-35.29359] → synagogue [il-synagogue-32.91544-35.29359] → synagogue [il-synagogue-32.91544-35.29359] → synagogue [il-synagogue-32.91544-35.29359] | synagogue [il-synagogue-32.91544-35.29359] → synagogue [il-synagogue-32.91544-35.29359] → synagogue [il-synagogue-32.91544-35.29359] → synagogue [il-synagogue-32.91544-35.29359] |
| מג'ד אל-כרום (il-32.9226-35.2580) | flat | 0 → synagogue [il-synagogue-32.91502-35.27434] → synagogue [il-synagogue-32.91502-35.27434] → 0 | 0 → synagogue [il-synagogue-32.91502-35.27434] → synagogue [il-synagogue-32.91502-35.27434] → 0 |
| בענה (il-32.9281-35.2722) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דיר אל אסד (il-32.9348-35.2668) | flat | minaret [il-minaret-32.93463-35.26961] → minaret [il-minaret-32.93463-35.26961] → minaret [il-minaret-32.93463-35.26961] → minaret [il-minaret-32.93463-35.26961] | minaret [il-minaret-32.93463-35.26961] → minaret [il-minaret-32.93463-35.26961] → minaret [il-minaret-32.93463-35.26961] → minaret [il-minaret-32.93463-35.26961] |
| נחף (il-32.9346-35.3176) | flat | minaret [il-minaret-32.93579-35.31644]; synagogue [il-synagogue-32.96816-35.49059]; synagogue [il-synagogue-32.98079-35.44056] → minaret [il-minaret-32.93579-35.31644] → minaret [il-minaret-32.93579-35.31644] → minaret [il-minaret-32.93579-35.31644] | minaret [il-minaret-32.93579-35.31644]; synagogue [il-synagogue-32.96816-35.49059]; synagogue [il-synagogue-32.98079-35.44056] → minaret [il-minaret-32.93579-35.31644] → minaret [il-minaret-32.93579-35.31644] → minaret [il-minaret-32.93579-35.31644] |
| שזור (il-32.9327-35.3535) | flat | synagogue [il-synagogue-32.93333-35.35231]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.93333-35.35231] → synagogue [il-synagogue-32.93333-35.35231] → synagogue [il-synagogue-32.93333-35.35231] | synagogue [il-synagogue-32.93333-35.35231]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.93333-35.35231] → synagogue [il-synagogue-32.93333-35.35231] → synagogue [il-synagogue-32.93333-35.35231] |
| סאג׳ור (il-32.9420-35.3422) | flat | synagogue [il-synagogue-32.96816-35.49059]; synagogue [il-synagogue-32.98079-35.44056] → 0 → 0 → 0 | synagogue [il-synagogue-32.96816-35.49059]; synagogue [il-synagogue-32.98079-35.44056] → 0 → 0 → 0 |
| מצפה נטופה (il-32.8028-35.3830) | flat | synagogue [il-synagogue-32.80351-35.38354] → synagogue [il-synagogue-32.80351-35.38354] → synagogue [il-synagogue-32.80351-35.38354] → synagogue [il-synagogue-32.80351-35.38354] | synagogue [il-synagogue-32.80351-35.38354] → synagogue [il-synagogue-32.80351-35.38354] → synagogue [il-synagogue-32.80351-35.38354] → synagogue [il-synagogue-32.80351-35.38354] |
| אבטליון (il-32.8362-35.3503) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עראבה (il-32.8486-35.3358) | flat | minaret [il-minaret-32.84629-35.33613]; minaret [il-minaret-32.8529-35.33424] → minaret [il-minaret-32.84629-35.33613]; minaret [il-minaret-32.8529-35.33424] → minaret [il-minaret-32.84629-35.33613]; minaret [il-minaret-32.8529-35.33424]; minaret [il-minaret-32.85964-35.31345] → minaret [il-minaret-32.84629-35.33613]; minaret [il-minaret-32.8529-35.33424] | minaret [il-minaret-32.84629-35.33613]; minaret [il-minaret-32.8529-35.33424] → minaret [il-minaret-32.84629-35.33613]; minaret [il-minaret-32.8529-35.33424] → minaret [il-minaret-32.84629-35.33613]; minaret [il-minaret-32.8529-35.33424]; minaret [il-minaret-32.85964-35.31345] → minaret [il-minaret-32.84629-35.33613]; minaret [il-minaret-32.8529-35.33424] |
| יחד (il-32.8453-35.3615) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| הררית (il-32.8458-35.3692) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דיר חנא (il-32.8625-35.3667) | flat | minaret [il-minaret-32.86191-35.37163]; minaret [il-minaret-32.86295-35.35873] → minaret [il-minaret-32.86191-35.37163]; minaret [il-minaret-32.86295-35.35873] → minaret [il-minaret-32.86191-35.37163]; minaret [il-minaret-32.86295-35.35873] → minaret [il-minaret-32.86191-35.37163]; minaret [il-minaret-32.86295-35.35873] | minaret [il-minaret-32.86191-35.37163]; minaret [il-minaret-32.86295-35.35873] → minaret [il-minaret-32.86191-35.37163]; minaret [il-minaret-32.86295-35.35873] → minaret [il-minaret-32.86191-35.37163]; minaret [il-minaret-32.86295-35.35873] → minaret [il-minaret-32.86191-35.37163]; minaret [il-minaret-32.86295-35.35873] |
| אשבל (il-32.8768-35.3050) | flat | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 |
| לוטם (il-32.8817-35.3585) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעלה צביה (il-32.8895-35.3306) | flat | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 | minaret [il-minaret-32.86343-35.29695] → 0 → 0 → 0 |
| ארבל (il-32.8121-35.4853) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ואדי אל-חמאם (il-32.8296-35.4904) | flat | minaret [il-minaret-32.82863-35.49154] → minaret [il-minaret-32.82863-35.49154] → minaret [il-minaret-32.82863-35.49154] → minaret [il-minaret-32.82863-35.49154] | minaret [il-minaret-32.82863-35.49154] → minaret [il-minaret-32.82863-35.49154] → minaret [il-minaret-32.82863-35.49154] → minaret [il-minaret-32.82863-35.49154] |
| מגדל (il-32.8387-35.4994) | flat | synagogue [il-synagogue-32.83759-35.49781]; synagogue [il-synagogue-32.83807-35.5079] → synagogue [il-synagogue-32.83759-35.49781]; synagogue [il-synagogue-32.83807-35.5079] → synagogue [il-synagogue-32.83759-35.49781]; synagogue [il-synagogue-32.83807-35.5079] → synagogue [il-synagogue-32.83759-35.49781]; synagogue [il-synagogue-32.83807-35.5079] | synagogue [il-synagogue-32.83759-35.49781]; synagogue [il-synagogue-32.83807-35.5079] → synagogue [il-synagogue-32.83759-35.49781]; synagogue [il-synagogue-32.83807-35.5079] → synagogue [il-synagogue-32.83759-35.49781]; synagogue [il-synagogue-32.83807-35.5079] → synagogue [il-synagogue-32.83759-35.49781]; synagogue [il-synagogue-32.83807-35.5079] |
| מסד (il-32.8441-35.4245) | flat | church [il-church-32.88077-35.55592] → 0 → 0 → 0 | church [il-church-32.88077-35.55592] → 0 → 0 → 0 |
| רביד (il-32.8516-35.4634) | flat | church [il-church-32.88077-35.55592] → 0 → 0 → 0 | church [il-church-32.88077-35.55592] → 0 → 0 → 0 |
| ליבנים (il-32.8648-35.4956) | flat | synagogue [il-synagogue-32.86502-35.49655] → synagogue [il-synagogue-32.86502-35.49655] → synagogue [il-synagogue-32.86502-35.49655] → synagogue [il-synagogue-32.86502-35.49655] | synagogue [il-synagogue-32.86502-35.49655] → synagogue [il-synagogue-32.86502-35.49655] → synagogue [il-synagogue-32.86502-35.49655] → synagogue [il-synagogue-32.86502-35.49655] |
| טפחות (il-32.8683-35.4219) | flat | church [il-church-32.88077-35.55592]; synagogue [il-synagogue-32.86837-35.42225]; synagogue [il-synagogue-32.87084-35.41948] → synagogue [il-synagogue-32.86837-35.42225]; synagogue [il-synagogue-32.87084-35.41948] → synagogue [il-synagogue-32.86837-35.42225]; synagogue [il-synagogue-32.87084-35.41948] → synagogue [il-synagogue-32.86837-35.42225]; synagogue [il-synagogue-32.87084-35.41948] | church [il-church-32.88077-35.55592]; synagogue [il-synagogue-32.86837-35.42225]; synagogue [il-synagogue-32.87084-35.41948] → synagogue [il-synagogue-32.86837-35.42225]; synagogue [il-synagogue-32.87084-35.41948] → synagogue [il-synagogue-32.86837-35.42225]; synagogue [il-synagogue-32.87084-35.41948] → synagogue [il-synagogue-32.86837-35.42225]; synagogue [il-synagogue-32.87084-35.41948] |
| כלנית (il-32.8750-35.4528) | flat | synagogue [il-synagogue-32.87481-35.4545] → synagogue [il-synagogue-32.87481-35.4545] → synagogue [il-synagogue-32.87481-35.4545] → synagogue [il-synagogue-32.87481-35.4545] | synagogue [il-synagogue-32.87481-35.4545] → synagogue [il-synagogue-32.87481-35.4545] → synagogue [il-synagogue-32.87481-35.4545] → synagogue [il-synagogue-32.87481-35.4545] |
| חוקוק (il-32.8803-35.4952) | flat | church [il-church-32.8805-35.57538]; synagogue [il-synagogue-32.87917-35.49513] → synagogue [il-synagogue-32.87917-35.49513] → synagogue [il-synagogue-32.87917-35.49513] → synagogue [il-synagogue-32.87917-35.49513] | church [il-church-32.8805-35.57538]; synagogue [il-synagogue-32.87917-35.49513] → synagogue [il-synagogue-32.87917-35.49513] → synagogue [il-synagogue-32.87917-35.49513] → synagogue [il-synagogue-32.87917-35.49513] |
| קדרים (il-32.8984-35.4738) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גינוסר (il-32.8476-35.5236) | flat | church [il-church-32.82675-35.51529]; synagogue [il-synagogue-32.83807-35.5079] → church [il-church-32.82675-35.51529]; synagogue [il-synagogue-32.83807-35.5079] → church [il-church-32.82675-35.51529]; synagogue [il-synagogue-32.83807-35.5079] → church [il-church-32.82675-35.51529]; synagogue [il-synagogue-32.83807-35.5079] | church [il-church-32.82675-35.51529]; synagogue [il-synagogue-32.83807-35.5079] → church [il-church-32.82675-35.51529]; synagogue [il-synagogue-32.83807-35.5079] → church [il-church-32.82675-35.51529]; synagogue [il-synagogue-32.83807-35.5079] → church [il-church-32.82675-35.51529]; synagogue [il-synagogue-32.83807-35.5079] |
| כחל (il-32.8907-35.5118) | flat | church [il-church-32.8805-35.57538]; synagogue [il-synagogue-32.89037-35.51163] → synagogue [il-synagogue-32.89037-35.51163] → synagogue [il-synagogue-32.89037-35.51163] → synagogue [il-synagogue-32.89037-35.51163] | church [il-church-32.8805-35.57538]; synagogue [il-synagogue-32.89037-35.51163] → synagogue [il-synagogue-32.89037-35.51163] → synagogue [il-synagogue-32.89037-35.51163] → synagogue [il-synagogue-32.89037-35.51163] |
| אמנון (il-32.9044-35.5705) | flat | synagogue [il-synagogue-32.90534-35.57264] → synagogue [il-synagogue-32.90534-35.57264] → synagogue [il-synagogue-32.90534-35.57264] → synagogue [il-synagogue-32.90534-35.57264] | synagogue [il-synagogue-32.90534-35.57264] → synagogue [il-synagogue-32.90534-35.57264] → synagogue [il-synagogue-32.90534-35.57264] → synagogue [il-synagogue-32.90534-35.57264] |
| רמות (il-32.8498-35.6668) | flat | church [il-church-32.8805-35.57538] → 0 → 0 → 0 | church [il-church-32.8805-35.57538] → 0 → 0 → 0 |
| כנף (il-32.8700-35.6983) | flat | church [il-church-32.8805-35.57538] → 0 → 0 → 0 | church [il-church-32.8805-35.57538] → 0 → 0 → 0 |
| מעלה גמלא (il-32.8899-35.6848) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גשור (il-32.8192-35.7160) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבני איתן (il-32.8246-35.7667) | flat | synagogue [il-synagogue-32.8243-35.76693] → synagogue [il-synagogue-32.8243-35.76693] → synagogue [il-synagogue-32.8243-35.76693] → synagogue [il-synagogue-32.8243-35.76693] | synagogue [il-synagogue-32.8243-35.76693] → synagogue [il-synagogue-32.8243-35.76693] → synagogue [il-synagogue-32.8243-35.76693] → synagogue [il-synagogue-32.8243-35.76693] |
| נוב (il-32.8323-35.7832) | flat | synagogue [il-synagogue-32.83218-35.78381] → synagogue [il-synagogue-32.83218-35.78381] → synagogue [il-synagogue-32.83218-35.78381] → synagogue [il-synagogue-32.83218-35.78381] | synagogue [il-synagogue-32.83218-35.78381] → synagogue [il-synagogue-32.83218-35.78381] → synagogue [il-synagogue-32.83218-35.78381] → synagogue [il-synagogue-32.83218-35.78381] |
| חיספין (il-32.8451-35.7928) | flat | synagogue [il-synagogue-32.84544-35.78991] → synagogue [il-synagogue-32.84544-35.78991] → synagogue [il-synagogue-32.84544-35.78991] → synagogue [il-synagogue-32.84544-35.78991] | synagogue [il-synagogue-32.84544-35.78991] → synagogue [il-synagogue-32.84544-35.78991] → synagogue [il-synagogue-32.84544-35.78991] → synagogue [il-synagogue-32.84544-35.78991] |
| נטור (il-32.8538-35.7515) | flat | church [il-church-32.8805-35.57538]; synagogue [il-synagogue-32.85387-35.74893] → synagogue [il-synagogue-32.85387-35.74893] → synagogue [il-synagogue-32.85387-35.74893] → synagogue [il-synagogue-32.85387-35.74893] | church [il-church-32.8805-35.57538]; synagogue [il-synagogue-32.85387-35.74893] → synagogue [il-synagogue-32.85387-35.74893] → synagogue [il-synagogue-32.85387-35.74893] → synagogue [il-synagogue-32.85387-35.74893] |
| רמת מגשימים (il-32.8440-35.8074) | flat | synagogue [il-synagogue-32.84409-35.80679] → synagogue [il-synagogue-32.84409-35.80679] → synagogue [il-synagogue-32.84409-35.80679] → synagogue [il-synagogue-32.84409-35.80679] | synagogue [il-synagogue-32.84409-35.80679] → synagogue [il-synagogue-32.84409-35.80679] → synagogue [il-synagogue-32.84409-35.80679] → synagogue [il-synagogue-32.84409-35.80679] |
| رزانية صيدا (il-32.8831-35.8616) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-בסה א-שרקיה (il-32.8997-35.8781) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עכו (il-32.9282-35.0756) | flat | minaret [il-minaret-32.92196-35.07064] → minaret [il-minaret-32.92196-35.07064] → minaret [il-minaret-32.92196-35.07064] → minaret [il-minaret-32.92196-35.07064] | minaret [il-minaret-32.92196-35.07064] → minaret [il-minaret-32.92196-35.07064] → minaret [il-minaret-32.92196-35.07064] → minaret [il-minaret-32.92196-35.07064] |
| בוסתן הגליל (il-32.9494-35.0851) | flat | minaret [il-minaret-32.92196-35.07064] → 0 → 0 → 0 | minaret [il-minaret-32.92196-35.07064] → 0 → 0 → 0 |
| שמרת (il-32.9507-35.0960) | flat | church [il-church-32.92027-35.06728]; minaret [il-minaret-32.92196-35.07064] → 0 → 0 → 0 | church [il-church-32.92027-35.06728]; minaret [il-minaret-32.92196-35.07064] → 0 → 0 → 0 |
| לוחמי הגטאות (il-32.9629-35.0974) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שבי ציון (il-32.9806-35.0833) | flat | minaret [il-minaret-32.983-35.0989] → 0 → 0 → 0 | minaret [il-minaret-32.983-35.0989] → 0 → 0 → 0 |
| נהריה (il-33.0066-35.0984) | flat | synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] | synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] |
| מזרעה (il-32.9833-35.0983) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נהריה (il-33.0063-35.0946) | flat | synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] | synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] → synagogue [il-synagogue-33.00436-35.10678] |
| רגבה (il-32.9780-35.0997) | flat | synagogue [il-synagogue-32.97626-35.09802] → synagogue [il-synagogue-32.97626-35.09802] → synagogue [il-synagogue-32.97626-35.09802] → synagogue [il-synagogue-32.97626-35.09802] | synagogue [il-synagogue-32.97626-35.09802] → synagogue [il-synagogue-32.97626-35.09802] → synagogue [il-synagogue-32.97626-35.09802] → synagogue [il-synagogue-32.97626-35.09802] |
| סער (il-33.0294-35.1093) | flat | synagogue [il-synagogue-33.02455-35.10844] → synagogue [il-synagogue-33.02455-35.10844] → synagogue [il-synagogue-33.02455-35.10844] → synagogue [il-synagogue-33.02455-35.10844] | synagogue [il-synagogue-33.02455-35.10844] → synagogue [il-synagogue-33.02455-35.10844] → synagogue [il-synagogue-33.02455-35.10844] → synagogue [il-synagogue-33.02455-35.10844] |
| גשר הזיו (il-33.0395-35.1110) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| טל-אל (il-32.9279-35.1821) | flat | synagogue [il-synagogue-32.92576-35.18048] → synagogue [il-synagogue-32.92576-35.18048] → synagogue [il-synagogue-32.92576-35.18048] → synagogue [il-synagogue-32.92576-35.18048] | synagogue [il-synagogue-32.92576-35.18048] → synagogue [il-synagogue-32.92576-35.18048] → synagogue [il-synagogue-32.92576-35.18048] → synagogue [il-synagogue-32.92576-35.18048] |
| ג׳דיידה-מכר (il-32.9295-35.1467) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג'וליס (il-32.9431-35.1869) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבו סנאן (il-32.9586-35.1717) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר יאסיף (il-32.9533-35.1657) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ירכא (il-32.9549-35.2088) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נס עמים (il-32.9657-35.1212) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית העמק (il-32.9705-35.1461) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אשרת (il-32.9717-35.1565) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עמקה (il-32.9792-35.1643) | flat | minaret [il-minaret-32.97724-35.16804] → minaret [il-minaret-32.97724-35.16804] → minaret [il-minaret-32.97724-35.16804] → minaret [il-minaret-32.97724-35.16804] | minaret [il-minaret-32.97724-35.16804] → minaret [il-minaret-32.97724-35.16804] → minaret [il-minaret-32.97724-35.16804] → minaret [il-minaret-32.97724-35.16804] |
| נתיב השיירה (il-32.9928-35.1355) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שייח דנון (il-32.9943-35.1479) | flat | minaret [il-minaret-32.99387-35.14697] → minaret [il-minaret-32.99387-35.14697] → minaret [il-minaret-32.99387-35.14697] → minaret [il-minaret-32.99387-35.14697] | minaret [il-minaret-32.99387-35.14697] → minaret [il-minaret-32.99387-35.14697] → minaret [il-minaret-32.99387-35.14697] → minaret [il-minaret-32.99387-35.14697] |
| תובל (il-32.9291-35.2448) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| פלך (il-32.9339-35.2336) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| לבון (il-32.9425-35.2871) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כישור (il-32.9458-35.2495) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| לפידות (il-32.9592-35.2621) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כיסרא (il-32.9629-35.3021) | flat | minaret [il-minaret-32.96759-35.30251]; synagogue [il-synagogue-32.98079-35.44056] → minaret [il-minaret-32.96759-35.30251] → minaret [il-minaret-32.96759-35.30251] → minaret [il-minaret-32.96759-35.30251] | minaret [il-minaret-32.96759-35.30251]; synagogue [il-synagogue-32.98079-35.44056] → minaret [il-minaret-32.96759-35.30251] → minaret [il-minaret-32.96759-35.30251] → minaret [il-minaret-32.96759-35.30251] |
| גיתה (il-32.9672-35.2491) | flat | synagogue [il-synagogue-32.96786-35.24889] → synagogue [il-synagogue-32.96786-35.24889] → synagogue [il-synagogue-32.96786-35.24889] → synagogue [il-synagogue-32.96786-35.24889] | synagogue [il-synagogue-32.96786-35.24889] → synagogue [il-synagogue-32.96786-35.24889] → synagogue [il-synagogue-32.96786-35.24889] → synagogue [il-synagogue-32.96786-35.24889] |
| ג׳ת (il-32.9737-35.2328) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ינוח (il-32.9837-35.2519) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר ורדים (il-32.9957-35.2764) | flat | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-32.9949-35.26791]; synagogue [il-synagogue-32.9972-35.27615] → synagogue [il-synagogue-32.9949-35.26791]; synagogue [il-synagogue-32.9972-35.27615] → synagogue [il-synagogue-32.9949-35.26791]; synagogue [il-synagogue-32.9972-35.27615] → synagogue [il-synagogue-32.9949-35.26791]; synagogue [il-synagogue-32.9972-35.27615] | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-32.9949-35.26791]; synagogue [il-synagogue-32.9972-35.27615] → synagogue [il-synagogue-32.9949-35.26791]; synagogue [il-synagogue-32.9972-35.27615] → synagogue [il-synagogue-32.9949-35.26791]; synagogue [il-synagogue-32.9972-35.27615] → synagogue [il-synagogue-32.9949-35.26791]; synagogue [il-synagogue-32.9972-35.27615] |
| מעלות תרשיחא (il-33.0157-35.2760) | flat | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.01319-35.28716] → synagogue [il-synagogue-33.01319-35.28716] → synagogue [il-synagogue-33.01319-35.28716] → synagogue [il-synagogue-33.01319-35.28716] | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.01319-35.28716] → synagogue [il-synagogue-33.01319-35.28716] → synagogue [il-synagogue-33.01319-35.28716] → synagogue [il-synagogue-33.01319-35.28716] |
| מעיליא (il-33.0281-35.2583) | flat | church [il-church-33.04347-35.41413] → 0 → 0 → 0 | church [il-church-33.04347-35.41413] → 0 → 0 → 0 |
| יחיעם (il-32.9967-35.2204) | flat | synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 | synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 |
| חוסן (il-32.9976-35.2980) | flat | church [il-church-33.04347-35.41413] → 0 → 0 → 0 | church [il-church-33.04347-35.41413] → 0 → 0 → 0 |
| מכמנים (il-32.9061-35.3288) | flat | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 |
| כמון (il-32.9114-35.3613) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ראס אל-עין (il-32.9158-35.3727) | flat | minaret [il-minaret-32.91654-35.37293] → minaret [il-minaret-32.91654-35.37293] → minaret [il-minaret-32.91654-35.37293] → minaret [il-minaret-32.91654-35.37293] | minaret [il-minaret-32.91654-35.37293] → minaret [il-minaret-32.91654-35.37293] → minaret [il-minaret-32.91654-35.37293] → minaret [il-minaret-32.91654-35.37293] |
| מורן (il-32.9216-35.3935) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ראמה (il-32.9380-35.3676) | flat | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 |
| עין אל אסד (il-32.9403-35.4010) | flat | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 |
| הר חלוץ (il-32.9507-35.3122) | flat | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 |
| חרשים (il-32.9570-35.3280) | flat | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 |
| בית ג'ן (il-32.9645-35.3781) | flat | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 |
| פקיעין (il-32.9772-35.3340) | flat | synagogue [il-synagogue-32.96816-35.49059]; synagogue [il-synagogue-32.977-35.3358] → synagogue [il-synagogue-32.977-35.3358] → synagogue [il-synagogue-32.977-35.3358] → synagogue [il-synagogue-32.977-35.3358] | synagogue [il-synagogue-32.96816-35.49059]; synagogue [il-synagogue-32.977-35.3358] → synagogue [il-synagogue-32.977-35.3358] → synagogue [il-synagogue-32.977-35.3358] → synagogue [il-synagogue-32.977-35.3358] |
| כפר סומיע (il-32.9803-35.3072) | flat | synagogue [il-synagogue-32.98079-35.44056] → 0 → 0 → 0 | synagogue [il-synagogue-32.98079-35.44056] → 0 → 0 → 0 |
| ענבר (il-32.9101-35.4226) | flat | church [il-church-32.88077-35.55592] → 0 → 0 → 0 | church [il-church-32.88077-35.55592] → 0 → 0 → 0 |
| כפר חנניה (il-32.9171-35.4233) | flat | synagogue [il-synagogue-32.9173-35.42445] → synagogue [il-synagogue-32.9173-35.42445] → synagogue [il-synagogue-32.9173-35.42445] → synagogue [il-synagogue-32.9173-35.42445] | synagogue [il-synagogue-32.9173-35.42445] → synagogue [il-synagogue-32.9173-35.42445] → synagogue [il-synagogue-32.9173-35.42445] → synagogue [il-synagogue-32.9173-35.42445] |
| פרוד (il-32.9333-35.4333) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שפר (il-32.9439-35.4362) | flat | synagogue [il-synagogue-32.94336-35.43745] → synagogue [il-synagogue-32.94336-35.43745] → synagogue [il-synagogue-32.94336-35.43745] → synagogue [il-synagogue-32.94336-35.43745] | synagogue [il-synagogue-32.94336-35.43745] → synagogue [il-synagogue-32.94336-35.43745] → synagogue [il-synagogue-32.94336-35.43745] → synagogue [il-synagogue-32.94336-35.43745] |
| צפת (il-32.9662-35.4962) | flat | synagogue [il-synagogue-32.9652-35.49903]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.9652-35.49903]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.9652-35.49903]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.9652-35.49903]; synagogue [il-synagogue-32.96816-35.49059] | synagogue [il-synagogue-32.9652-35.49903]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.9652-35.49903]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.9652-35.49903]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.9652-35.49903]; synagogue [il-synagogue-32.96816-35.49059] |
| ביריה (il-32.9776-35.5007) | flat | synagogue [il-synagogue-32.97972-35.50428] → synagogue [il-synagogue-32.97972-35.50428] → synagogue [il-synagogue-32.97972-35.50428] → synagogue [il-synagogue-32.97972-35.50428] | synagogue [il-synagogue-32.97972-35.50428] → synagogue [il-synagogue-32.97972-35.50428] → synagogue [il-synagogue-32.97972-35.50428] → synagogue [il-synagogue-32.97972-35.50428] |
| כפר שמאי (il-32.9574-35.4579) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מירון (il-32.9886-35.4403) | flat | synagogue [il-synagogue-32.98079-35.44056]; synagogue [il-synagogue-33.00541-35.51904] → synagogue [il-synagogue-32.98079-35.44056] → synagogue [il-synagogue-32.98079-35.44056] → synagogue [il-synagogue-32.98079-35.44056] | synagogue [il-synagogue-32.98079-35.44056]; synagogue [il-synagogue-33.00541-35.51904] → synagogue [il-synagogue-32.98079-35.44056] → synagogue [il-synagogue-32.98079-35.44056] → synagogue [il-synagogue-32.98079-35.44056] |
| בר יוחאי (il-32.9970-35.4481) | flat | synagogue [il-synagogue-32.99715-35.44966]; synagogue [il-synagogue-33.00541-35.51904] → synagogue [il-synagogue-32.99715-35.44966] → synagogue [il-synagogue-32.99715-35.44966] → synagogue [il-synagogue-32.99715-35.44966] | synagogue [il-synagogue-32.99715-35.44966]; synagogue [il-synagogue-33.00541-35.51904] → synagogue [il-synagogue-32.99715-35.44966] → synagogue [il-synagogue-32.99715-35.44966] → synagogue [il-synagogue-32.99715-35.44966] |
| כורזים (il-32.9110-35.5527) | flat | synagogue [il-synagogue-32.91177-35.54757] → synagogue [il-synagogue-32.91177-35.54757] → synagogue [il-synagogue-32.91177-35.54757] → synagogue [il-synagogue-32.91177-35.54757] | synagogue [il-synagogue-32.91177-35.54757] → synagogue [il-synagogue-32.91177-35.54757] → synagogue [il-synagogue-32.91177-35.54757] → synagogue [il-synagogue-32.91177-35.54757] |
| אלמגור (il-32.9139-35.6033) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עמיעד (il-32.9287-35.5416) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אליפלט (il-32.9480-35.5474) | flat | synagogue [il-synagogue-32.98079-35.44056] → 0 → 0 → 0 | synagogue [il-synagogue-32.98079-35.44056] → 0 → 0 → 0 |
| חצור הגלילית (il-32.9792-35.5433) | flat | synagogue [il-synagogue-32.97905-35.54579]; synagogue [il-synagogue-32.98079-35.44056] → synagogue [il-synagogue-32.97905-35.54579] → synagogue [il-synagogue-32.97905-35.54579] → synagogue [il-synagogue-32.97905-35.54579] | synagogue [il-synagogue-32.97905-35.54579]; synagogue [il-synagogue-32.98079-35.44056] → synagogue [il-synagogue-32.97905-35.54579] → synagogue [il-synagogue-32.97905-35.54579] → synagogue [il-synagogue-32.97905-35.54579] |
| טובא זנגריה (il-32.9663-35.5944) | flat | minaret [il-minaret-32.96693-35.59823]; minaret [il-minaret-32.96731-35.59358]; synagogue [il-synagogue-32.96816-35.49059] → minaret [il-minaret-32.96693-35.59823]; minaret [il-minaret-32.96731-35.59358] → minaret [il-minaret-32.96693-35.59823]; minaret [il-minaret-32.96731-35.59358] → minaret [il-minaret-32.96693-35.59823]; minaret [il-minaret-32.96731-35.59358] | minaret [il-minaret-32.96693-35.59823]; minaret [il-minaret-32.96731-35.59358]; synagogue [il-synagogue-32.96816-35.49059] → minaret [il-minaret-32.96693-35.59823]; minaret [il-minaret-32.96731-35.59358] → minaret [il-minaret-32.96693-35.59823]; minaret [il-minaret-32.96731-35.59358] → minaret [il-minaret-32.96693-35.59823]; minaret [il-minaret-32.96731-35.59358] |
| כפר הנשיא (il-32.9749-35.6038) | flat | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 |
| מחניים (il-32.9886-35.5707) | flat | minaret [il-minaret-32.96693-35.59823]; synagogue [il-synagogue-32.98079-35.44056] → 0 → 0 → 0 | minaret [il-minaret-32.96693-35.59823]; synagogue [il-synagogue-32.98079-35.44056] → 0 → 0 → 0 |
| עמוקה (il-32.9980-35.5243) | flat | church [il-church-33.04347-35.41413] → 0 → 0 → 0 | church [il-church-33.04347-35.41413] → 0 → 0 → 0 |
| חד נס (il-32.9284-35.6430) | flat | synagogue [il-synagogue-32.92878-35.64248] → synagogue [il-synagogue-32.92878-35.64248] → synagogue [il-synagogue-32.92878-35.64248] → synagogue [il-synagogue-32.92878-35.64248] | synagogue [il-synagogue-32.92878-35.64248] → synagogue [il-synagogue-32.92878-35.64248] → synagogue [il-synagogue-32.92878-35.64248] → synagogue [il-synagogue-32.92878-35.64248] |
| כרכום (il-32.9293-35.6086) | flat | synagogue [il-synagogue-32.92985-35.6091]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.92985-35.6091] → synagogue [il-synagogue-32.92985-35.6091] → synagogue [il-synagogue-32.92985-35.6091] | synagogue [il-synagogue-32.92985-35.6091]; synagogue [il-synagogue-32.96816-35.49059] → synagogue [il-synagogue-32.92985-35.6091] → synagogue [il-synagogue-32.92985-35.6091] → synagogue [il-synagogue-32.92985-35.6091] |
| קצרין (il-32.9920-35.6877) | flat | synagogue [il-synagogue-32.99019-35.67627]; synagogue [il-synagogue-32.99115-35.68703] → synagogue [il-synagogue-32.99019-35.67627]; synagogue [il-synagogue-32.99115-35.68703] → synagogue [il-synagogue-32.99019-35.67627]; synagogue [il-synagogue-32.99115-35.68703] → synagogue [il-synagogue-32.99019-35.67627]; synagogue [il-synagogue-32.99115-35.68703] | synagogue [il-synagogue-32.99019-35.67627]; synagogue [il-synagogue-32.99115-35.68703] → synagogue [il-synagogue-32.99019-35.67627]; synagogue [il-synagogue-32.99115-35.68703] → synagogue [il-synagogue-32.99019-35.67627]; synagogue [il-synagogue-32.99115-35.68703] → synagogue [il-synagogue-32.99019-35.67627]; synagogue [il-synagogue-32.99115-35.68703] |
| יונתן (il-32.9385-35.7950) | flat | synagogue [il-synagogue-32.93738-35.79456] → synagogue [il-synagogue-32.93738-35.79456] → synagogue [il-synagogue-32.93738-35.79456] → synagogue [il-synagogue-32.93738-35.79456] | synagogue [il-synagogue-32.93738-35.79456] → synagogue [il-synagogue-32.93738-35.79456] → synagogue [il-synagogue-32.93738-35.79456] → synagogue [il-synagogue-32.93738-35.79456] |
| אניעם (il-32.9569-35.7398) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-מעלקה (il-32.9171-35.8932) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| א-רפיד (il-32.9560-35.9009) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קשת (il-32.9807-35.8086) | flat | synagogue [il-synagogue-32.98052-35.80922] → synagogue [il-synagogue-32.98052-35.80922] → synagogue [il-synagogue-32.98052-35.80922] → synagogue [il-synagogue-32.98052-35.80922] | synagogue [il-synagogue-32.98052-35.80922] → synagogue [il-synagogue-32.98052-35.80922] → synagogue [il-synagogue-32.98052-35.80922] → synagogue [il-synagogue-32.98052-35.80922] |
| אל-אסבח (il-32.9794-35.8844) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל בוטיחה (il-32.9364-35.9113) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כברי (il-33.0215-35.1485) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נווה זיו (il-33.0276-35.1835) | flat | synagogue [il-synagogue-33.02767-35.181] → synagogue [il-synagogue-33.02767-35.181] → synagogue [il-synagogue-33.02767-35.181] → synagogue [il-synagogue-33.02767-35.181] | synagogue [il-synagogue-33.02767-35.181] → synagogue [il-synagogue-33.02767-35.181] → synagogue [il-synagogue-33.02767-35.181] → synagogue [il-synagogue-33.02767-35.181] |
| מנות (il-33.0384-35.1947) | flat | synagogue [il-synagogue-33.01319-35.28716]; synagogue [il-synagogue-33.03827-35.19506] → synagogue [il-synagogue-33.03827-35.19506] → synagogue [il-synagogue-33.03827-35.19506] → synagogue [il-synagogue-33.03827-35.19506] | synagogue [il-synagogue-33.01319-35.28716]; synagogue [il-synagogue-33.03827-35.19506] → synagogue [il-synagogue-33.03827-35.19506] → synagogue [il-synagogue-33.03827-35.19506] → synagogue [il-synagogue-33.03827-35.19506] |
| עבדון (il-33.0480-35.1794) | flat | synagogue [il-synagogue-33.04764-35.18043] → synagogue [il-synagogue-33.04764-35.18043] → synagogue [il-synagogue-33.04764-35.18043] → synagogue [il-synagogue-33.04764-35.18043] | synagogue [il-synagogue-33.04764-35.18043] → synagogue [il-synagogue-33.04764-35.18043] → synagogue [il-synagogue-33.04764-35.18043] → synagogue [il-synagogue-33.04764-35.18043] |
| לימן (il-33.0595-35.1130) | flat | synagogue [il-synagogue-33.05941-35.11357] → synagogue [il-synagogue-33.05941-35.11357] → synagogue [il-synagogue-33.05941-35.11357] → synagogue [il-synagogue-33.05941-35.11357] | synagogue [il-synagogue-33.05941-35.11357] → synagogue [il-synagogue-33.05941-35.11357] → synagogue [il-synagogue-33.05941-35.11357] → synagogue [il-synagogue-33.05941-35.11357] |
| מצובה (il-33.0629-35.1571) | flat | synagogue [il-synagogue-33.06267-35.15762] → synagogue [il-synagogue-33.06267-35.15762] → synagogue [il-synagogue-33.06267-35.15762] → synagogue [il-synagogue-33.06267-35.15762] | synagogue [il-synagogue-33.06267-35.15762] → synagogue [il-synagogue-33.06267-35.15762] → synagogue [il-synagogue-33.06267-35.15762] → synagogue [il-synagogue-33.06267-35.15762] |
| יערה (il-33.0674-35.1859) | flat | synagogue [il-synagogue-33.06745-35.18658] → synagogue [il-synagogue-33.06745-35.18658] → synagogue [il-synagogue-33.06745-35.18658] → synagogue [il-synagogue-33.06745-35.18658] | synagogue [il-synagogue-33.06745-35.18658] → synagogue [il-synagogue-33.06745-35.18658] → synagogue [il-synagogue-33.06745-35.18658] → synagogue [il-synagogue-33.06745-35.18658] |
| שלומי (il-33.0721-35.1451) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ראש הנקרה (il-33.0857-35.1151) | flat | synagogue [il-synagogue-33.08606-35.11982] → synagogue [il-synagogue-33.08606-35.11982] → synagogue [il-synagogue-33.08606-35.11982] → synagogue [il-synagogue-33.08606-35.11982] | synagogue [il-synagogue-33.08606-35.11982] → synagogue [il-synagogue-33.08606-35.11982] → synagogue [il-synagogue-33.08606-35.11982] → synagogue [il-synagogue-33.08606-35.11982] |
| חניתה (il-33.0874-35.1733) | flat | synagogue [il-synagogue-33.08801-35.17405] → synagogue [il-synagogue-33.08801-35.17405] → synagogue [il-synagogue-33.08801-35.17405] → synagogue [il-synagogue-33.08801-35.17405] | synagogue [il-synagogue-33.08801-35.17405] → synagogue [il-synagogue-33.08801-35.17405] → synagogue [il-synagogue-33.08801-35.17405] → synagogue [il-synagogue-33.08801-35.17405] |
| לבונה (il-33.0933-35.1487) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| געתון (il-33.0057-35.2137) | flat | synagogue [il-synagogue-33.01319-35.28716] → 0 → synagogue [il-synagogue-33.00838-35.22964] → 0 | synagogue [il-synagogue-33.01319-35.28716] → 0 → synagogue [il-synagogue-33.00838-35.22964] → 0 |
| עין יעקב (il-33.0095-35.2293) | flat | synagogue [il-synagogue-33.00838-35.22964] → synagogue [il-synagogue-33.00838-35.22964] → synagogue [il-synagogue-33.00838-35.22964] → synagogue [il-synagogue-33.00838-35.22964] | synagogue [il-synagogue-33.00838-35.22964] → synagogue [il-synagogue-33.00838-35.22964] → synagogue [il-synagogue-33.00838-35.22964] → synagogue [il-synagogue-33.00838-35.22964] |
| מצפה הילה (il-33.0358-35.2443) | flat | church [il-church-33.04347-35.41413] → 0 → 0 → 0 | church [il-church-33.04347-35.41413] → 0 → 0 → 0 |
| אבירים (il-33.0386-35.2871) | flat | church [il-church-33.04347-35.41413] → 0 → 0 → 0 | church [il-church-33.04347-35.41413] → 0 → 0 → 0 |
| גורן (il-33.0564-35.2370) | flat | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.05738-35.23612] → synagogue [il-synagogue-33.05738-35.23612] → synagogue [il-synagogue-33.05738-35.23612] → synagogue [il-synagogue-33.05738-35.23612] | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.05738-35.23612] → synagogue [il-synagogue-33.05738-35.23612] → synagogue [il-synagogue-33.05738-35.23612] → synagogue [il-synagogue-33.05738-35.23612] |
| גרנות הגליל (il-33.0595-35.2497) | flat | church [il-church-33.04347-35.41413] → 0 → 0 → 0 | church [il-church-33.04347-35.41413] → 0 → 0 → 0 |
| אילון (il-33.0633-35.2197) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אבן מנחם (il-33.0736-35.2941) | flat | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.07401-35.29447] → synagogue [il-synagogue-33.07401-35.29447] → synagogue [il-synagogue-33.07401-35.29447] → synagogue [il-synagogue-33.07401-35.29447] | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.07401-35.29447] → synagogue [il-synagogue-33.07401-35.29447] → synagogue [il-synagogue-33.07401-35.29447] → synagogue [il-synagogue-33.07401-35.29447] |
| אדמית (il-33.0796-35.2103) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| א-ד'והיירה (il-33.1011-35.2271) | flat | minaret [il-minaret-33.09959-35.22748] → minaret [il-minaret-33.09959-35.22748] → minaret [il-minaret-33.09959-35.22748] → minaret [il-minaret-33.09959-35.22748] | minaret [il-minaret-33.09959-35.22748] → minaret [il-minaret-33.09959-35.22748] → minaret [il-minaret-33.09959-35.22748] → minaret [il-minaret-33.09959-35.22748] |
| זרעית (il-33.0996-35.2886) | flat | synagogue [il-synagogue-33.09967-35.28934] → synagogue [il-synagogue-33.09967-35.28934] → synagogue [il-synagogue-33.09967-35.28934] → synagogue [il-synagogue-33.09967-35.28934] | synagogue [il-synagogue-33.09967-35.28934] → synagogue [il-synagogue-33.09967-35.28934] → synagogue [il-synagogue-33.09967-35.28934] → synagogue [il-synagogue-33.09967-35.28934] |
| בסתן (il-33.1010-35.2548) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| חורפיש (il-33.0174-35.3470) | flat | church [il-church-33.04347-35.41413] → 0 → 0 → 0 | church [il-church-33.04347-35.41413] → 0 → 0 → 0 |
| סאסא (il-33.0269-35.3950) | flat | synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 | synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 |
| אלקוש (il-33.0342-35.3242) | flat | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.02156-35.28782]; synagogue [il-synagogue-33.03271-35.32257] → synagogue [il-synagogue-33.03271-35.32257] → synagogue [il-synagogue-33.03271-35.32257] → synagogue [il-synagogue-33.03271-35.32257] | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.02156-35.28782]; synagogue [il-synagogue-33.03271-35.32257] → synagogue [il-synagogue-33.03271-35.32257] → synagogue [il-synagogue-33.03271-35.32257] → synagogue [il-synagogue-33.03271-35.32257] |
| פסוטה (il-33.0484-35.3100) | flat | church [il-church-33.04347-35.41413] → 0 → 0 → 0 | church [il-church-33.04347-35.41413] → 0 → 0 → 0 |
| נטועה (il-33.0649-35.3233) | flat | synagogue [il-synagogue-33.06341-35.32151] → synagogue [il-synagogue-33.06341-35.32151] → synagogue [il-synagogue-33.06341-35.32151] → synagogue [il-synagogue-33.06341-35.32151] | synagogue [il-synagogue-33.06341-35.32151] → synagogue [il-synagogue-33.06341-35.32151] → synagogue [il-synagogue-33.06341-35.32151] → synagogue [il-synagogue-33.06341-35.32151] |
| שתולה (il-33.0848-35.3143) | flat | synagogue [il-synagogue-33.08492-35.31483] → synagogue [il-synagogue-33.08492-35.31483] → synagogue [il-synagogue-33.08492-35.31483] → synagogue [il-synagogue-33.08492-35.31483] | synagogue [il-synagogue-33.08492-35.31483] → synagogue [il-synagogue-33.08492-35.31483] → synagogue [il-synagogue-33.08492-35.31483] → synagogue [il-synagogue-33.08492-35.31483] |
| אור הגנוז (il-33.0051-35.4475) | flat | synagogue [il-synagogue-33.00541-35.51904]; synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 | synagogue [il-synagogue-33.00541-35.51904]; synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 |
| דלתון (il-33.0167-35.4892) | flat | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.0162-35.48967] → synagogue [il-synagogue-33.0162-35.48967] → synagogue [il-synagogue-33.0162-35.48967] → synagogue [il-synagogue-33.0162-35.48967] | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.0162-35.48967] → synagogue [il-synagogue-33.0162-35.48967] → synagogue [il-synagogue-33.0162-35.48967] → synagogue [il-synagogue-33.0162-35.48967] |
| ג'ש (il-33.0244-35.4459) | flat | minaret [il-minaret-33.01927-35.45119]; synagogue [il-synagogue-33.00541-35.51904] → minaret [il-minaret-33.01927-35.45119] → minaret [il-minaret-33.01927-35.45119] → minaret [il-minaret-33.01927-35.45119] | minaret [il-minaret-33.01927-35.45119]; synagogue [il-synagogue-33.00541-35.51904] → minaret [il-minaret-33.01927-35.45119] → minaret [il-minaret-33.01927-35.45119] → minaret [il-minaret-33.01927-35.45119] |
| צבעון (il-33.0259-35.4166) | flat | minaret [il-minaret-33.01927-35.45119]; synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 | minaret [il-minaret-33.01927-35.45119]; synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 |
| כרם בן זמרה (il-33.0389-35.4680) | flat | synagogue [il-synagogue-33.03881-35.46973] → synagogue [il-synagogue-33.03881-35.46973] → synagogue [il-synagogue-33.03881-35.46973] → synagogue [il-synagogue-33.03881-35.46973] | synagogue [il-synagogue-33.03881-35.46973] → synagogue [il-synagogue-33.03881-35.46973] → synagogue [il-synagogue-33.03881-35.46973] → synagogue [il-synagogue-33.03881-35.46973] |
| ריחאנייה (il-33.0482-35.4873) | flat | church [il-church-33.04347-35.41413]; minaret [il-minaret-33.04889-35.48606] → minaret [il-minaret-33.04889-35.48606] → minaret [il-minaret-33.04889-35.48606] → minaret [il-minaret-33.04889-35.48606] | church [il-church-33.04347-35.41413]; minaret [il-minaret-33.04889-35.48606] → minaret [il-minaret-33.04889-35.48606] → minaret [il-minaret-33.04889-35.48606] → minaret [il-minaret-33.04889-35.48606] |
| עלמה (il-33.0521-35.4988) | flat | synagogue [il-synagogue-33.05122-35.49962] → synagogue [il-synagogue-33.05122-35.49962] → synagogue [il-synagogue-33.05122-35.49962] → synagogue [il-synagogue-33.05122-35.49962] | synagogue [il-synagogue-33.05122-35.49962] → synagogue [il-synagogue-33.05122-35.49962] → synagogue [il-synagogue-33.05122-35.49962] → synagogue [il-synagogue-33.05122-35.49962] |
| דוב״ב (il-33.0525-35.4075) | flat | synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 | synagogue [il-synagogue-33.01319-35.28716] → 0 → 0 → 0 |
| ברעם (il-33.0591-35.4340) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יראון (il-33.0778-35.4558) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אביבים (il-33.0887-35.4729) | flat | synagogue [il-synagogue-33.08952-35.47108] → synagogue [il-synagogue-33.08952-35.47108] → synagogue [il-synagogue-33.08952-35.47108] → synagogue [il-synagogue-33.08952-35.47108] | synagogue [il-synagogue-33.08952-35.47108] → synagogue [il-synagogue-33.08952-35.47108] → synagogue [il-synagogue-33.08952-35.47108] → synagogue [il-synagogue-33.08952-35.47108] |
| משמר הירדן (il-33.0056-35.6003) | flat | synagogue [il-synagogue-33.00456-35.59713]; synagogue [il-synagogue-33.00541-35.51904] → synagogue [il-synagogue-33.00456-35.59713] → synagogue [il-synagogue-33.00456-35.59713] → synagogue [il-synagogue-33.00456-35.59713] | synagogue [il-synagogue-33.00456-35.59713]; synagogue [il-synagogue-33.00541-35.51904] → synagogue [il-synagogue-33.00456-35.59713] → synagogue [il-synagogue-33.00456-35.59713] → synagogue [il-synagogue-33.00456-35.59713] |
| איילת השחר (il-33.0216-35.5759) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה אליעזר (il-33.0459-35.5641) | flat | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.04551-35.5644] → synagogue [il-synagogue-33.04551-35.5644] → synagogue [il-synagogue-33.04551-35.5644] → synagogue [il-synagogue-33.04551-35.5644] | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.04551-35.5644] → synagogue [il-synagogue-33.04551-35.5644] → synagogue [il-synagogue-33.04551-35.5644] → synagogue [il-synagogue-33.04551-35.5644] |
| חולתה (il-33.0511-35.6092) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| יסוד המעלה (il-33.0585-35.6079) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דישון (il-33.0813-35.5175) | flat | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.08181-35.51812] → synagogue [il-synagogue-33.08181-35.51812] → synagogue [il-synagogue-33.08181-35.51812] → synagogue [il-synagogue-33.08181-35.51812] | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.08181-35.51812] → synagogue [il-synagogue-33.08181-35.51812] → synagogue [il-synagogue-33.08181-35.51812] → synagogue [il-synagogue-33.08181-35.51812] |
| מלכיה (il-33.0992-35.5117) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמות נפתלי (il-33.1023-35.5531) | flat | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.10301-35.55213] → synagogue [il-synagogue-33.10301-35.55213] → synagogue [il-synagogue-33.10301-35.55213] → synagogue [il-synagogue-33.10301-35.55213] | church [il-church-33.04347-35.41413]; synagogue [il-synagogue-33.10301-35.55213] → synagogue [il-synagogue-33.10301-35.55213] → synagogue [il-synagogue-33.10301-35.55213] → synagogue [il-synagogue-33.10301-35.55213] |
| גדות (il-33.0181-35.6189) | flat | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 | synagogue [il-synagogue-32.96816-35.49059] → 0 → 0 → 0 |
| קדמת צבי (il-33.0297-35.6970) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אורטל (il-33.0852-35.7594) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| עין זיוון (il-33.0963-35.7962) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כודנה (il-33.0091-35.8885) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אלוני הבשן (il-33.0441-35.8392) | flat | synagogue [il-synagogue-33.04451-35.8408] → synagogue [il-synagogue-33.04451-35.8408] → synagogue [il-synagogue-33.04451-35.8408] → synagogue [il-synagogue-33.04451-35.8408] | synagogue [il-synagogue-33.04451-35.8408] → synagogue [il-synagogue-33.04451-35.8408] → synagogue [il-synagogue-33.04451-35.8408] → synagogue [il-synagogue-33.04451-35.8408] |
| בריקה (il-33.0430-35.8711) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ביר אל-עג'ם (il-33.0531-35.8674) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| رويحينة (il-33.0827-35.8715) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מרווחין (il-33.1086-35.2767) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ראמיה (il-33.1111-35.3100) | flat | minaret [il-minaret-33.11018-35.31093] → minaret [il-minaret-33.11018-35.31093] → minaret [il-minaret-33.11018-35.31093] → minaret [il-minaret-33.11018-35.31093] | minaret [il-minaret-33.11018-35.31093] → minaret [il-minaret-33.11018-35.31093] → minaret [il-minaret-33.11018-35.31093] → minaret [il-minaret-33.11018-35.31093] |
| יפתח (il-33.1286-35.5519) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נאות מרדכי (il-33.1606-35.5966) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| קרית שמונה (il-33.2075-35.5708) | flat | synagogue [il-synagogue-33.20791-35.57375]; synagogue [il-synagogue-33.2095-35.56665] → synagogue [il-synagogue-33.20791-35.57375]; synagogue [il-synagogue-33.2095-35.56665] → synagogue [il-synagogue-33.20791-35.57375]; synagogue [il-synagogue-33.2095-35.56665] → synagogue [il-synagogue-33.20791-35.57375]; synagogue [il-synagogue-33.2095-35.56665] | synagogue [il-synagogue-33.20791-35.57375]; synagogue [il-synagogue-33.2095-35.56665] → synagogue [il-synagogue-33.20791-35.57375]; synagogue [il-synagogue-33.2095-35.56665] → synagogue [il-synagogue-33.20791-35.57375]; synagogue [il-synagogue-33.2095-35.56665] → synagogue [il-synagogue-33.20791-35.57375]; synagogue [il-synagogue-33.2095-35.56665] |
| מנרה (il-33.1959-35.5446) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| גונן (il-33.1239-35.6463) | flat | synagogue [il-synagogue-33.12547-35.64712] → synagogue [il-synagogue-33.12547-35.64712] → synagogue [il-synagogue-33.12547-35.64712] → synagogue [il-synagogue-33.12547-35.64712] | synagogue [il-synagogue-33.12547-35.64712] → synagogue [il-synagogue-33.12547-35.64712] → synagogue [il-synagogue-33.12547-35.64712] → synagogue [il-synagogue-33.12547-35.64712] |
| קלע אלון (il-33.1308-35.6825) | flat | synagogue [il-synagogue-33.13059-35.68277] → synagogue [il-synagogue-33.13059-35.68277] → synagogue [il-synagogue-33.13059-35.68277] → synagogue [il-synagogue-33.13059-35.68277] | synagogue [il-synagogue-33.13059-35.68277] → synagogue [il-synagogue-33.13059-35.68277] → synagogue [il-synagogue-33.13059-35.68277] → synagogue [il-synagogue-33.13059-35.68277] |
| להבות הבשן (il-33.1406-35.6463) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| רמת טראמפ (il-33.1326-35.6906) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שמיר (il-33.1639-35.6592) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר בלום (il-33.1724-35.6101) | flat | synagogue [il-synagogue-33.17111-35.6089] → synagogue [il-synagogue-33.17111-35.6089] → synagogue [il-synagogue-33.17111-35.6089] → synagogue [il-synagogue-33.17111-35.6089] | synagogue [il-synagogue-33.17111-35.6089] → synagogue [il-synagogue-33.17111-35.6089] → synagogue [il-synagogue-33.17111-35.6089] → synagogue [il-synagogue-33.17111-35.6089] |
| עמיר (il-33.1788-35.6208) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שדה נחמיה (il-33.1869-35.6245) | flat | synagogue [il-synagogue-33.18579-35.62585] → synagogue [il-synagogue-33.18579-35.62585] → synagogue [il-synagogue-33.18579-35.62585] → synagogue [il-synagogue-33.18579-35.62585] | synagogue [il-synagogue-33.18579-35.62585] → synagogue [il-synagogue-33.18579-35.62585] → synagogue [il-synagogue-33.18579-35.62585] → synagogue [il-synagogue-33.18579-35.62585] |
| כפר סאלד (il-33.1947-35.6579) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| בית הלל (il-33.2083-35.6069) | flat | synagogue [il-synagogue-33.20632-35.60697] → synagogue [il-synagogue-33.20632-35.60697] → synagogue [il-synagogue-33.20632-35.60697] → synagogue [il-synagogue-33.20632-35.60697] | synagogue [il-synagogue-33.20632-35.60697] → synagogue [il-synagogue-33.20632-35.60697] → synagogue [il-synagogue-33.20632-35.60697] → synagogue [il-synagogue-33.20632-35.60697] |
| שעל (il-33.1166-35.7187) | flat | synagogue [il-synagogue-33.11687-35.71705] → synagogue [il-synagogue-33.11687-35.71705] → synagogue [il-synagogue-33.11687-35.71705] → synagogue [il-synagogue-33.11687-35.71705] | synagogue [il-synagogue-33.11687-35.71705] → synagogue [il-synagogue-33.11687-35.71705] → synagogue [il-synagogue-33.11687-35.71705] → synagogue [il-synagogue-33.11687-35.71705] |
| מרום גולן (il-33.1321-35.7773) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-רום (il-33.1797-35.7721) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אודם (il-33.1944-35.7483) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-קחטאניה (il-33.1093-35.8378) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| Shuli (il-33.1115-35.8496) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| Al-Rawadi (il-33.1382-35.8475) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-חמידייה (il-33.1563-35.8479) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| אל-חרריה (il-33.1897-35.8453) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מרגליות (il-33.2148-35.5445) | flat | synagogue [il-synagogue-33.2159-35.5446] → synagogue [il-synagogue-33.2159-35.5446] → synagogue [il-synagogue-33.2159-35.5446] → synagogue [il-synagogue-33.2159-35.5446] | synagogue [il-synagogue-33.2159-35.5446] → synagogue [il-synagogue-33.2159-35.5446] → synagogue [il-synagogue-33.2159-35.5446] → synagogue [il-synagogue-33.2159-35.5446] |
| כפר גלעדי (il-33.2418-35.5750) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר יובל (il-33.2474-35.5975) | flat | synagogue [il-synagogue-33.24736-35.59865] → synagogue [il-synagogue-33.24736-35.59865] → synagogue [il-synagogue-33.24736-35.59865] → synagogue [il-synagogue-33.24736-35.59865] | synagogue [il-synagogue-33.24736-35.59865] → synagogue [il-synagogue-33.24736-35.59865] → synagogue [il-synagogue-33.24736-35.59865] → synagogue [il-synagogue-33.24736-35.59865] |
| אל-עדייסה (il-33.2578-35.5467) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| כפר כילא (il-33.2827-35.5588) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| משגב עם (il-33.2478-35.5487) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מטולה (il-33.2800-35.5780) | flat | synagogue [il-synagogue-33.2793-35.57898] → synagogue [il-synagogue-33.2793-35.57898] → synagogue [il-synagogue-33.2793-35.57898] → synagogue [il-synagogue-33.2793-35.57898] | synagogue [il-synagogue-33.2793-35.57898] → synagogue [il-synagogue-33.2793-35.57898] → synagogue [il-synagogue-33.2793-35.57898] → synagogue [il-synagogue-33.2793-35.57898] |
| הגושרים (il-33.2211-35.6231) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דפנה (il-33.2304-35.6393) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מעיין ברוך (il-33.2398-35.6079) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| דן (il-33.2401-35.6531) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שניר (il-33.2410-35.6782) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מייסת (il-33.2627-35.6193) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ערב א-לויזה (il-33.2740-35.6146) | flat | minaret [il-minaret-33.26963-35.62321] → 0 → 0 → 0 | minaret [il-minaret-33.26963-35.62321] → 0 → 0 → 0 |
| ע'ג'ר (il-33.2722-35.6239) | flat | minaret [il-minaret-33.26963-35.62321] → minaret [il-minaret-33.26963-35.62321] → minaret [il-minaret-33.26963-35.62321] → minaret [il-minaret-33.26963-35.62321] | minaret [il-minaret-33.26963-35.62321] → minaret [il-minaret-33.26963-35.62321] → minaret [il-minaret-33.26963-35.62321] → minaret [il-minaret-33.26963-35.62321] |
| מסעדה (il-33.2312-35.7575) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נמרוד (il-33.2452-35.7510) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| מג'דל שמס (il-33.2684-35.7694) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| נווה אטי"ב (il-33.2620-35.7408) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| ג'בתא אל-ח'שב (il-33.2258-35.8341) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
| שבעא (il-33.3445-35.7494) | flat | 0 → 0 → 0 → 0 | 0 → 0 → 0 → 0 |
