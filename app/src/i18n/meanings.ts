import type { Lang } from '../tdm/types'

/**
 * What the common parts of school diagrams do, in the three languages of the pilot classrooms. Matched to a
 * part's name when the teacher reviews; marked "from glossary" until the teacher confirms or rewrites it.
 * Deterministic and offline: no model writes a sentence a teacher has not seen.
 */
export type Meaning = { en: string; hi: string; pa: string }
type Entry = { names: string[]; m: Meaning }

const G: Entry[] = [
  { names: ['right atrium'], m: { en: 'Receives deoxygenated blood from the body through the vena cava and passes it to the right ventricle.', hi: 'शरीर से ऑक्सीजन-रहित रक्त महाशिरा द्वारा लेता है और दाएँ निलय को भेजता है।', pa: 'ਸਰੀਰ ਤੋਂ ਆਕਸੀਜਨ-ਰਹਿਤ ਲਹੂ ਮਹਾਂਸ਼ਿਰਾ ਰਾਹੀਂ ਲੈਂਦਾ ਹੈ ਅਤੇ ਸੱਜੇ ਨਿਲਯ ਨੂੰ ਭੇਜਦਾ ਹੈ।' } },
  { names: ['right ventricle'], m: { en: 'Pumps deoxygenated blood to the lungs through the pulmonary artery.', hi: 'ऑक्सीजन-रहित रक्त को फुफ्फुस धमनी द्वारा फेफड़ों तक पंप करता है।', pa: 'ਆਕਸੀਜਨ-ਰਹਿਤ ਲਹੂ ਨੂੰ ਫੇਫੜਿਆਂ ਤੱਕ ਪਲਮੋਨਰੀ ਧਮਣੀ ਰਾਹੀਂ ਪੰਪ ਕਰਦਾ ਹੈ।' } },
  { names: ['left atrium'], m: { en: 'Receives oxygen-rich blood from the lungs through the pulmonary veins.', hi: 'फेफड़ों से ऑक्सीजन-युक्त रक्त फुफ्फुस शिराओं द्वारा लेता है।', pa: 'ਫੇਫੜਿਆਂ ਤੋਂ ਆਕਸੀਜਨ-ਯੁਕਤ ਲਹੂ ਪਲਮੋਨਰੀ ਸ਼ਿਰਾਵਾਂ ਰਾਹੀਂ ਲੈਂਦਾ ਹੈ।' } },
  { names: ['left ventricle'], m: { en: 'The thickest chamber. Pumps oxygen-rich blood to the whole body through the aorta.', hi: 'सबसे मोटा कक्ष। ऑक्सीजन-युक्त रक्त महाधमनी द्वारा पूरे शरीर में पंप करता है।', pa: 'ਸਭ ਤੋਂ ਮੋਟਾ ਕਮਰਾ। ਆਕਸੀਜਨ-ਯੁਕਤ ਲਹੂ ਮਹਾਂਧਮਣੀ ਰਾਹੀਂ ਪੂਰੇ ਸਰੀਰ ਵਿੱਚ ਪੰਪ ਕਰਦਾ ਹੈ।' } },
  { names: ['septum', 'heart wall'], m: { en: 'The muscular wall that keeps oxygen-rich and oxygen-poor blood apart.', hi: 'पेशीय दीवार जो ऑक्सीजन-युक्त और ऑक्सीजन-रहित रक्त को अलग रखती है।', pa: 'ਪੇਸ਼ੀ ਦੀ ਕੰਧ ਜੋ ਆਕਸੀਜਨ-ਯੁਕਤ ਤੇ ਆਕਸੀਜਨ-ਰਹਿਤ ਲਹੂ ਨੂੰ ਵੱਖ ਰੱਖਦੀ ਹੈ।' } },
  { names: ['aorta'], m: { en: 'The largest artery. Carries oxygen-rich blood from the left ventricle to the body.', hi: 'सबसे बड़ी धमनी। बाएँ निलय से ऑक्सीजन-युक्त रक्त शरीर तक ले जाती है।', pa: 'ਸਭ ਤੋਂ ਵੱਡੀ ਧਮਣੀ। ਖੱਬੇ ਨਿਲਯ ਤੋਂ ਆਕਸੀਜਨ-ਯੁਕਤ ਲਹੂ ਸਰੀਰ ਤੱਕ ਲੈ ਜਾਂਦੀ ਹੈ।' } },
  { names: ['pulmonary artery'], m: { en: 'Carries deoxygenated blood from the right ventricle to the lungs.', hi: 'दाएँ निलय से ऑक्सीजन-रहित रक्त फेफड़ों तक ले जाती है।', pa: 'ਸੱਜੇ ਨਿਲਯ ਤੋਂ ਆਕਸੀਜਨ-ਰਹਿਤ ਲਹੂ ਫੇਫੜਿਆਂ ਤੱਕ ਲੈ ਜਾਂਦੀ ਹੈ।' } },
  { names: ['pulmonary vein', 'pulmonary veins'], m: { en: 'Bring oxygen-rich blood from the lungs to the left atrium.', hi: 'फेफड़ों से ऑक्सीजन-युक्त रक्त बाएँ आलिंद तक लाती हैं।', pa: 'ਫੇਫੜਿਆਂ ਤੋਂ ਆਕਸੀਜਨ-ਯੁਕਤ ਲਹੂ ਖੱਬੇ ਆਲਿੰਦ ਤੱਕ ਲਿਆਉਂਦੀਆਂ ਹਨ।' } },
  { names: ['superior vena cava', 'inferior vena cava', 'vena cava'], m: { en: 'A large vein bringing deoxygenated blood from the body to the right atrium.', hi: 'बड़ी शिरा जो शरीर से ऑक्सीजन-रहित रक्त दाएँ आलिंद तक लाती है।', pa: 'ਵੱਡੀ ਸ਼ਿਰਾ ਜੋ ਸਰੀਰ ਤੋਂ ਆਕਸੀਜਨ-ਰਹਿਤ ਲਹੂ ਸੱਜੇ ਆਲਿੰਦ ਤੱਕ ਲਿਆਉਂਦੀ ਹੈ।' } },
  { names: ['valve', 'tricuspid valve', 'bicuspid valve', 'mitral valve'], m: { en: 'Opens one way so blood cannot flow backwards.', hi: 'एक ही दिशा में खुलता है ताकि रक्त पीछे न बहे।', pa: 'ਇੱਕ ਪਾਸੇ ਖੁੱਲ੍ਹਦਾ ਹੈ ਤਾਂ ਜੋ ਲਹੂ ਪਿੱਛੇ ਨਾ ਵਹੇ।' } },
  { names: ['cell wall'], m: { en: 'The rigid outer layer of a plant cell, made of cellulose. Gives shape and protection.', hi: 'पादप कोशिका की कठोर बाहरी परत, सेलुलोज़ की बनी। आकार और सुरक्षा देती है।', pa: 'ਪੌਦੇ ਦੀ ਕੋਸ਼ਿਕਾ ਦੀ ਸਖ਼ਤ ਬਾਹਰੀ ਪਰਤ, ਸੈਲੂਲੋਜ਼ ਦੀ ਬਣੀ। ਆਕਾਰ ਤੇ ਸੁਰੱਖਿਆ ਦਿੰਦੀ ਹੈ।' } },
  { names: ['cell membrane', 'plasma membrane'], m: { en: 'Controls what enters and leaves the cell.', hi: 'कोशिका में क्या अंदर आए और क्या बाहर जाए, इसे नियंत्रित करती है।', pa: 'ਕੋਸ਼ਿਕਾ ਵਿੱਚ ਕੀ ਅੰਦਰ ਆਵੇ ਤੇ ਕੀ ਬਾਹਰ ਜਾਵੇ, ਇਹ ਕਾਬੂ ਕਰਦੀ ਹੈ।' } },
  { names: ['nucleus'], m: { en: 'Controls the cell and holds the chromosomes.', hi: 'कोशिका को नियंत्रित करता है और गुणसूत्र रखता है।', pa: 'ਕੋਸ਼ਿਕਾ ਨੂੰ ਕਾਬੂ ਕਰਦਾ ਹੈ ਤੇ ਗੁਣਸੂਤਰ ਰੱਖਦਾ ਹੈ।' } },
  { names: ['nucleolus'], m: { en: 'The dense body inside the nucleus where ribosomes are made.', hi: 'केंद्रक के भीतर घना पिंड जहाँ राइबोसोम बनते हैं।', pa: 'ਨਿਊਕਲੀਅਸ ਅੰਦਰ ਸੰਘਣਾ ਪਿੰਡ ਜਿੱਥੇ ਰਾਈਬੋਸੋਮ ਬਣਦੇ ਹਨ।' } },
  { names: ['nuclear membrane', 'nuclear envelope'], m: { en: 'The double membrane around the nucleus, with pores that let materials pass.', hi: 'केंद्रक के चारों ओर दोहरी झिल्ली, जिसके छिद्रों से पदार्थ आते-जाते हैं।', pa: 'ਨਿਊਕਲੀਅਸ ਦੁਆਲੇ ਦੂਹਰੀ ਝਿੱਲੀ, ਜਿਸਦੇ ਛੇਕਾਂ ਰਾਹੀਂ ਪਦਾਰਥ ਆਉਂਦੇ-ਜਾਂਦੇ ਹਨ।' } },
  { names: ['cytoplasm'], m: { en: 'The jelly that fills the cell and holds every organelle.', hi: 'जेली जैसा पदार्थ जो कोशिका को भरता है और हर कोशिकांग को थामे रखता है।', pa: 'ਜੈਲੀ ਵਰਗਾ ਪਦਾਰਥ ਜੋ ਕੋਸ਼ਿਕਾ ਨੂੰ ਭਰਦਾ ਹੈ ਤੇ ਹਰ ਅੰਗਕ ਨੂੰ ਥੰਮ੍ਹਦਾ ਹੈ।' } },
  { names: ['vacuole', 'central vacuole'], m: { en: 'Stores water, sugars and waste, and keeps the cell firm.', hi: 'पानी, शर्करा और अपशिष्ट संग्रहित करती है और कोशिका को तना रखती है।', pa: 'ਪਾਣੀ, ਸ਼ੱਕਰ ਤੇ ਰਹਿੰਦ-ਖੂੰਹਦ ਜਮ੍ਹਾਂ ਰੱਖਦੀ ਹੈ ਤੇ ਕੋਸ਼ਿਕਾ ਨੂੰ ਤਣਿਆ ਰੱਖਦੀ ਹੈ।' } },
  { names: ['chloroplast', 'chloroplasts'], m: { en: 'Holds chlorophyll. Photosynthesis makes food from sunlight here.', hi: 'क्लोरोफ़िल रखता है। यहाँ प्रकाश-संश्लेषण से सूर्य के प्रकाश से भोजन बनता है।', pa: 'ਕਲੋਰੋਫ਼ਿਲ ਰੱਖਦਾ ਹੈ। ਇੱਥੇ ਪ੍ਰਕਾਸ਼-ਸੰਸ਼ਲੇਸ਼ਣ ਨਾਲ ਧੁੱਪ ਤੋਂ ਭੋਜਨ ਬਣਦਾ ਹੈ।' } },
  { names: ['mitochondrion', 'mitochondria'], m: { en: 'Releases energy from food. The powerhouse of the cell.', hi: 'भोजन से ऊर्जा मुक्त करता है। कोशिका का ऊर्जा-घर।', pa: 'ਭੋਜਨ ਤੋਂ ਊਰਜਾ ਛੱਡਦਾ ਹੈ। ਕੋਸ਼ਿਕਾ ਦਾ ਊਰਜਾ-ਘਰ।' } },
  { names: ['ribosome', 'ribosomes'], m: { en: 'Builds proteins.', hi: 'प्रोटीन बनाते हैं।', pa: 'ਪ੍ਰੋਟੀਨ ਬਣਾਉਂਦੇ ਹਨ।' } },
  { names: ['endoplasmic reticulum', 'rough endoplasmic reticulum', 'smooth endoplasmic reticulum'], m: { en: 'A network of channels that makes and transports proteins and fats.', hi: 'नलिकाओं का जाल जो प्रोटीन और वसा बनाता और पहुँचाता है।', pa: 'ਨਲੀਆਂ ਦਾ ਜਾਲ ਜੋ ਪ੍ਰੋਟੀਨ ਤੇ ਚਰਬੀ ਬਣਾਉਂਦਾ ਤੇ ਪਹੁੰਚਾਉਂਦਾ ਹੈ।' } },
  { names: ['golgi body', 'golgi apparatus', 'golgi'], m: { en: 'Packs and sends out proteins made by the cell.', hi: 'कोशिका द्वारा बने प्रोटीन को पैक करके बाहर भेजता है।', pa: 'ਕੋਸ਼ਿਕਾ ਵੱਲੋਂ ਬਣੇ ਪ੍ਰੋਟੀਨ ਨੂੰ ਪੈਕ ਕਰਕੇ ਬਾਹਰ ਭੇਜਦਾ ਹੈ।' } },
  { names: ['lysosome', 'lysosomes'], m: { en: 'Digests waste and worn-out parts of the cell.', hi: 'अपशिष्ट और घिसे हुए कोशिका भागों को पचाता है।', pa: 'ਰਹਿੰਦ-ਖੂੰਹਦ ਤੇ ਘਸੇ ਹੋਏ ਕੋਸ਼ਿਕਾ ਹਿੱਸਿਆਂ ਨੂੰ ਹਜ਼ਮ ਕਰਦਾ ਹੈ।' } },
  { names: ['petal', 'petals', 'corolla'], m: { en: 'Coloured leaves that attract insects for pollination.', hi: 'रंगीन पत्तियाँ जो परागण के लिए कीटों को आकर्षित करती हैं।', pa: 'ਰੰਗਦਾਰ ਪੱਤੀਆਂ ਜੋ ਪਰਾਗਣ ਲਈ ਕੀੜਿਆਂ ਨੂੰ ਖਿੱਚਦੀਆਂ ਹਨ।' } },
  { names: ['sepal', 'sepals', 'calyx'], m: { en: 'Green leaves that protect the flower bud.', hi: 'हरी पत्तियाँ जो कली की रक्षा करती हैं।', pa: 'ਹਰੀਆਂ ਪੱਤੀਆਂ ਜੋ ਕਲੀ ਦੀ ਰੱਖਿਆ ਕਰਦੀਆਂ ਹਨ।' } },
  { names: ['stamen', 'anther', 'filament'], m: { en: 'The male part. The anther makes pollen; the filament holds it up.', hi: 'नर भाग। परागकोश पराग बनाता है; तंतु उसे थामे रखता है।', pa: 'ਨਰ ਹਿੱਸਾ। ਪਰਾਗਕੋਸ਼ ਪਰਾਗ ਬਣਾਉਂਦਾ ਹੈ; ਤੰਤੂ ਉਸਨੂੰ ਥੰਮ੍ਹਦਾ ਹੈ।' } },
  { names: ['pistil', 'carpel', 'stigma', 'style', 'ovary'], m: { en: 'The female part. The stigma catches pollen, the style carries it down, the ovary holds the ovules that become seeds.', hi: 'मादा भाग। वर्तिकाग्र पराग पकड़ता है, वर्तिका उसे नीचे ले जाती है, अंडाशय में बीजांड होते हैं जो बीज बनते हैं।', pa: 'ਮਾਦਾ ਹਿੱਸਾ। ਵਰਤਿਕਾਗਰ ਪਰਾਗ ਫੜਦਾ ਹੈ, ਵਰਤਿਕਾ ਉਸਨੂੰ ਹੇਠਾਂ ਲੈ ਜਾਂਦੀ ਹੈ, ਅੰਡਕੋਸ਼ ਵਿੱਚ ਬੀਜਾਂਡ ਹੁੰਦੇ ਹਨ ਜੋ ਬੀਜ ਬਣਦੇ ਹਨ।' } },
  { names: ['ovule', 'ovules'], m: { en: 'Becomes a seed after fertilisation.', hi: 'निषेचन के बाद बीज बनता है।', pa: 'ਨਿਸ਼ੇਚਨ ਮਗਰੋਂ ਬੀਜ ਬਣਦਾ ਹੈ।' } },
  { names: ['receptacle'], m: { en: 'The swollen top of the stalk that holds all the flower parts.', hi: 'डंठल का फूला हुआ सिरा जो फूल के सभी भागों को थामे रखता है।', pa: 'ਡੰਡੀ ਦਾ ਫੁੱਲਿਆ ਸਿਰਾ ਜੋ ਫੁੱਲ ਦੇ ਸਾਰੇ ਹਿੱਸਿਆਂ ਨੂੰ ਥੰਮ੍ਹਦਾ ਹੈ।' } },
  { names: ['cornea'], m: { en: 'The clear front window of the eye. Does most of the focusing.', hi: 'आँख की पारदर्शी अगली खिड़की। अधिकांश फोकस यही करती है।', pa: 'ਅੱਖ ਦੀ ਪਾਰਦਰਸ਼ੀ ਅਗਲੀ ਖਿੜਕੀ। ਜ਼ਿਆਦਾਤਰ ਫੋਕਸ ਇਹੀ ਕਰਦੀ ਹੈ।' } },
  { names: ['iris'], m: { en: 'The coloured ring. Changes the size of the pupil to control light.', hi: 'रंगीन वलय। प्रकाश नियंत्रित करने के लिए पुतली का आकार बदलता है।', pa: 'ਰੰਗਦਾਰ ਛੱਲਾ। ਰੌਸ਼ਨੀ ਕਾਬੂ ਕਰਨ ਲਈ ਪੁਤਲੀ ਦਾ ਆਕਾਰ ਬਦਲਦਾ ਹੈ।' } },
  { names: ['pupil'], m: { en: 'The opening that lets light into the eye.', hi: 'छिद्र जिससे प्रकाश आँख में जाता है।', pa: 'ਛੇਕ ਜਿਸ ਰਾਹੀਂ ਰੌਸ਼ਨੀ ਅੱਖ ਵਿੱਚ ਜਾਂਦੀ ਹੈ।' } },
  { names: ['lens', 'eye lens'], m: { en: 'Changes shape to focus light on the retina.', hi: 'रेटिना पर प्रकाश फोकस करने के लिए आकार बदलता है।', pa: 'ਰੈਟਿਨਾ ਉੱਤੇ ਰੌਸ਼ਨੀ ਫੋਕਸ ਕਰਨ ਲਈ ਆਕਾਰ ਬਦਲਦਾ ਹੈ।' } },
  { names: ['retina'], m: { en: 'The light-sensitive layer at the back where the image forms.', hi: 'पीछे की प्रकाश-संवेदी परत जहाँ प्रतिबिंब बनता है।', pa: 'ਪਿੱਛੇ ਦੀ ਰੌਸ਼ਨੀ-ਸੰਵੇਦੀ ਪਰਤ ਜਿੱਥੇ ਪ੍ਰਤੀਬਿੰਬ ਬਣਦਾ ਹੈ।' } },
  { names: ['optic nerve'], m: { en: 'Carries the image signals from the retina to the brain.', hi: 'रेटिना से प्रतिबिंब के संकेत मस्तिष्क तक ले जाती है।', pa: 'ਰੈਟਿਨਾ ਤੋਂ ਪ੍ਰਤੀਬਿੰਬ ਦੇ ਸੰਕੇਤ ਦਿਮਾਗ਼ ਤੱਕ ਲੈ ਜਾਂਦੀ ਹੈ।' } },
  { names: ['ciliary muscle', 'ciliary muscles'], m: { en: 'Pull on the lens to change its focus.', hi: 'लेंस को खींचकर उसका फोकस बदलती हैं।', pa: 'ਲੈਂਜ਼ ਨੂੰ ਖਿੱਚ ਕੇ ਉਸਦਾ ਫੋਕਸ ਬਦਲਦੀਆਂ ਹਨ।' } },
  { names: ['sclera'], m: { en: 'The tough white outer coat of the eye.', hi: 'आँख का कठोर सफ़ेद बाहरी आवरण।', pa: 'ਅੱਖ ਦਾ ਸਖ਼ਤ ਚਿੱਟਾ ਬਾਹਰੀ ਆਵਰਣ।' } },
  { names: ['mouth', 'buccal cavity', 'oral cavity'], m: { en: 'Where food is chewed and mixed with saliva.', hi: 'जहाँ भोजन चबाया जाता है और लार से मिलता है।', pa: 'ਜਿੱਥੇ ਭੋਜਨ ਚਬਾਇਆ ਜਾਂਦਾ ਹੈ ਤੇ ਥੁੱਕ ਨਾਲ ਮਿਲਦਾ ਹੈ।' } },
  { names: ['oesophagus', 'esophagus', 'food pipe'], m: { en: 'Pushes food from the mouth to the stomach.', hi: 'भोजन को मुँह से आमाशय तक धकेलती है।', pa: 'ਭੋਜਨ ਨੂੰ ਮੂੰਹ ਤੋਂ ਮਿਹਦੇ ਤੱਕ ਧੱਕਦੀ ਹੈ।' } },
  { names: ['stomach'], m: { en: 'Churns food with acid and enzymes.', hi: 'भोजन को अम्ल और एंज़ाइम के साथ मथता है।', pa: 'ਭੋਜਨ ਨੂੰ ਤੇਜ਼ਾਬ ਤੇ ਐਨਜ਼ਾਈਮਾਂ ਨਾਲ ਰਿੜਕਦਾ ਹੈ।' } },
  { names: ['small intestine'], m: { en: 'Where most digestion finishes and food is absorbed into the blood.', hi: 'जहाँ अधिकांश पाचन पूरा होता है और भोजन रक्त में अवशोषित होता है।', pa: 'ਜਿੱਥੇ ਜ਼ਿਆਦਾਤਰ ਪਾਚਨ ਪੂਰਾ ਹੁੰਦਾ ਹੈ ਤੇ ਭੋਜਨ ਲਹੂ ਵਿੱਚ ਸੋਖਿਆ ਜਾਂਦਾ ਹੈ।' } },
  { names: ['large intestine', 'colon'], m: { en: 'Absorbs water and forms waste.', hi: 'पानी अवशोषित करती है और मल बनाती है।', pa: 'ਪਾਣੀ ਸੋਖਦੀ ਹੈ ਤੇ ਮਲ ਬਣਾਉਂਦੀ ਹੈ।' } },
  { names: ['liver'], m: { en: 'Makes bile to digest fats and processes nutrients from the blood.', hi: 'वसा पचाने के लिए पित्त बनाता है और रक्त के पोषक तत्वों का प्रसंस्करण करता है।', pa: 'ਚਰਬੀ ਹਜ਼ਮ ਕਰਨ ਲਈ ਪਿੱਤ ਬਣਾਉਂਦਾ ਹੈ ਤੇ ਲਹੂ ਦੇ ਪੋਸ਼ਕ ਤੱਤਾਂ ਨੂੰ ਸੰਭਾਲਦਾ ਹੈ।' } },
  { names: ['pancreas'], m: { en: 'Makes digestive enzymes and insulin.', hi: 'पाचक एंज़ाइम और इंसुलिन बनाता है।', pa: 'ਪਾਚਕ ਐਨਜ਼ਾਈਮ ਤੇ ਇਨਸੁਲਿਨ ਬਣਾਉਂਦਾ ਹੈ।' } },
  { names: ['gall bladder', 'gallbladder'], m: { en: 'Stores bile from the liver.', hi: 'यकृत से आया पित्त संग्रहित करता है।', pa: 'ਜਿਗਰ ਤੋਂ ਆਇਆ ਪਿੱਤ ਜਮ੍ਹਾਂ ਰੱਖਦਾ ਹੈ।' } },
  { names: ['rectum', 'anus'], m: { en: 'Stores and passes out waste.', hi: 'मल को संग्रहित करता और बाहर निकालता है।', pa: 'ਮਲ ਨੂੰ ਜਮ੍ਹਾਂ ਰੱਖਦਾ ਤੇ ਬਾਹਰ ਕੱਢਦਾ ਹੈ।' } },
  { names: ['lung', 'lungs'], m: { en: 'Take oxygen into the blood and remove carbon dioxide.', hi: 'रक्त में ऑक्सीजन लेते हैं और कार्बन डाइऑक्साइड निकालते हैं।', pa: 'ਲਹੂ ਵਿੱਚ ਆਕਸੀਜਨ ਲੈਂਦੇ ਹਨ ਤੇ ਕਾਰਬਨ ਡਾਈਆਕਸਾਈਡ ਕੱਢਦੇ ਹਨ।' } },
  { names: ['trachea', 'windpipe'], m: { en: 'The tube that carries air to the lungs.', hi: 'नली जो हवा फेफड़ों तक ले जाती है।', pa: 'ਨਲੀ ਜੋ ਹਵਾ ਫੇਫੜਿਆਂ ਤੱਕ ਲੈ ਜਾਂਦੀ ਹੈ।' } },
  { names: ['diaphragm'], m: { en: 'The muscle under the lungs that moves to pull air in and push it out.', hi: 'फेफड़ों के नीचे की पेशी जो हवा खींचने और छोड़ने के लिए चलती है।', pa: 'ਫੇਫੜਿਆਂ ਹੇਠਲੀ ਪੇਸ਼ੀ ਜੋ ਹਵਾ ਖਿੱਚਣ ਤੇ ਛੱਡਣ ਲਈ ਹਿਲਦੀ ਹੈ।' } },
  { names: ['kidney', 'kidneys'], m: { en: 'Filter waste from the blood to make urine.', hi: 'रक्त से अपशिष्ट छानकर मूत्र बनाते हैं।', pa: 'ਲਹੂ ਵਿੱਚੋਂ ਰਹਿੰਦ-ਖੂੰਹਦ ਛਾਣ ਕੇ ਪਿਸ਼ਾਬ ਬਣਾਉਂਦੇ ਹਨ।' } },
  { names: ['cell body'], m: { en: 'The neuron\'s centre, with the nucleus.', hi: 'तंत्रिका कोशिका का केंद्र, जिसमें केंद्रक है।', pa: 'ਨਿਊਰੋਨ ਦਾ ਕੇਂਦਰ, ਜਿਸ ਵਿੱਚ ਨਿਊਕਲੀਅਸ ਹੈ।' } },
  { names: ['dendrite', 'dendrites'], m: { en: 'Receive signals from other neurons.', hi: 'अन्य तंत्रिका कोशिकाओं से संकेत प्राप्त करते हैं।', pa: 'ਹੋਰ ਨਿਊਰੋਨਾਂ ਤੋਂ ਸੰਕੇਤ ਲੈਂਦੇ ਹਨ।' } },
  { names: ['axon'], m: { en: 'The long fibre that carries the signal away from the cell body.', hi: 'लंबा तंतु जो संकेत को कोशिका काय से दूर ले जाता है।', pa: 'ਲੰਮਾ ਤੰਤੂ ਜੋ ਸੰਕੇਤ ਨੂੰ ਕੋਸ਼ਿਕਾ ਕਾਇਆ ਤੋਂ ਦੂਰ ਲੈ ਜਾਂਦਾ ਹੈ।' } },
  { names: ['synapse', 'nerve ending', 'axon terminal'], m: { en: 'The gap where the signal passes to the next cell.', hi: 'वह अंतराल जहाँ संकेत अगली कोशिका तक जाता है।', pa: 'ਉਹ ਪਾੜਾ ਜਿੱਥੇ ਸੰਕੇਤ ਅਗਲੀ ਕੋਸ਼ਿਕਾ ਤੱਕ ਜਾਂਦਾ ਹੈ।' } },
  { names: ['myelin sheath'], m: { en: 'Insulates the axon so the signal travels faster.', hi: 'अक्षतंतु को ढकती है ताकि संकेत तेज़ चले।', pa: 'ਐਕਸੌਨ ਨੂੰ ਢਕਦੀ ਹੈ ਤਾਂ ਜੋ ਸੰਕੇਤ ਤੇਜ਼ ਚੱਲੇ।' } },
  { names: ['cell', 'battery'], m: { en: 'The source of electrical energy. Pushes current around the circuit.', hi: 'विद्युत ऊर्जा का स्रोत। परिपथ में धारा चलाता है।', pa: 'ਬਿਜਲਈ ਊਰਜਾ ਦਾ ਸਰੋਤ। ਸਰਕਟ ਵਿੱਚ ਕਰੰਟ ਚਲਾਉਂਦਾ ਹੈ।' } },
  { names: ['bulb', 'lamp'], m: { en: 'Glows when current flows through its filament.', hi: 'जब धारा इसके तंतु से बहती है तो चमकता है।', pa: 'ਜਦੋਂ ਕਰੰਟ ਇਸਦੇ ਤੰਤੂ ਵਿੱਚੋਂ ਵਗਦਾ ਹੈ ਤਾਂ ਚਮਕਦਾ ਹੈ।' } },
  { names: ['switch'], m: { en: 'Opens or closes the circuit to stop or start the current.', hi: 'धारा रोकने या चलाने के लिए परिपथ खोलता या बंद करता है।', pa: 'ਕਰੰਟ ਰੋਕਣ ਜਾਂ ਚਲਾਉਣ ਲਈ ਸਰਕਟ ਖੋਲ੍ਹਦਾ ਜਾਂ ਬੰਦ ਕਰਦਾ ਹੈ।' } },
  { names: ['resistor', 'resistance'], m: { en: 'Opposes the current and lowers it.', hi: 'धारा का विरोध करता है और उसे कम करता है।', pa: 'ਕਰੰਟ ਦਾ ਵਿਰੋਧ ਕਰਦਾ ਹੈ ਤੇ ਉਸਨੂੰ ਘਟਾਉਂਦਾ ਹੈ।' } },
  { names: ['ammeter'], m: { en: 'Measures the current, connected in series.', hi: 'धारा मापता है, श्रेणी में जुड़ा।', pa: 'ਕਰੰਟ ਮਾਪਦਾ ਹੈ, ਲੜੀ ਵਿੱਚ ਜੁੜਿਆ।' } },
  { names: ['voltmeter'], m: { en: 'Measures the voltage across a part, connected in parallel.', hi: 'किसी भाग के सिरों का वोल्टेज मापता है, समानांतर में जुड़ा।', pa: 'ਕਿਸੇ ਹਿੱਸੇ ਦੇ ਸਿਰਿਆਂ ਦੀ ਵੋਲਟੇਜ ਮਾਪਦਾ ਹੈ, ਸਮਾਨਾਂਤਰ ਵਿੱਚ ਜੁੜਿਆ।' } },
  { names: ['evaporation'], m: { en: 'Water turns to vapour from oceans, lakes and soil, warmed by the sun.', hi: 'सूर्य की गर्मी से समुद्र, झील और मिट्टी का पानी वाष्प बनता है।', pa: 'ਸੂਰਜ ਦੀ ਗਰਮੀ ਨਾਲ ਸਮੁੰਦਰ, ਝੀਲ ਤੇ ਮਿੱਟੀ ਦਾ ਪਾਣੀ ਭਾਫ਼ ਬਣਦਾ ਹੈ।' } },
  { names: ['condensation'], m: { en: 'Vapour cools high up and forms clouds.', hi: 'वाष्प ऊपर ठंडी होकर बादल बनाती है।', pa: 'ਭਾਫ਼ ਉੱਪਰ ਠੰਢੀ ਹੋ ਕੇ ਬੱਦਲ ਬਣਾਉਂਦੀ ਹੈ।' } },
  { names: ['precipitation', 'rain'], m: { en: 'Water falls from clouds as rain, snow or hail.', hi: 'बादलों से पानी वर्षा, हिम या ओले बनकर गिरता है।', pa: 'ਬੱਦਲਾਂ ਤੋਂ ਪਾਣੀ ਮੀਂਹ, ਬਰਫ਼ ਜਾਂ ਗੜਿਆਂ ਵਜੋਂ ਡਿੱਗਦਾ ਹੈ।' } },
  { names: ['transpiration'], m: { en: 'Plants release water vapour through their leaves.', hi: 'पौधे पत्तियों से जलवाष्प छोड़ते हैं।', pa: 'ਪੌਦੇ ਪੱਤਿਆਂ ਰਾਹੀਂ ਜਲ-ਭਾਫ਼ ਛੱਡਦੇ ਹਨ।' } },
  { names: ['root', 'roots'], m: { en: 'Anchor the plant and take in water and minerals from the soil.', hi: 'पौधे को थामे रखती हैं और मिट्टी से पानी-खनिज लेती हैं।', pa: 'ਪੌਦੇ ਨੂੰ ਥੰਮ੍ਹਦੀਆਂ ਹਨ ਤੇ ਮਿੱਟੀ ਤੋਂ ਪਾਣੀ-ਖਣਿਜ ਲੈਂਦੀਆਂ ਹਨ।' } },
  { names: ['stem'], m: { en: 'Holds the plant up and carries water and food between roots and leaves.', hi: 'पौधे को खड़ा रखता है और जड़ों व पत्तियों के बीच पानी-भोजन पहुँचाता है।', pa: 'ਪੌਦੇ ਨੂੰ ਖੜ੍ਹਾ ਰੱਖਦਾ ਹੈ ਤੇ ਜੜ੍ਹਾਂ ਅਤੇ ਪੱਤਿਆਂ ਵਿਚਕਾਰ ਪਾਣੀ-ਭੋਜਨ ਪਹੁੰਚਾਉਂਦਾ ਹੈ।' } },
  { names: ['leaf', 'leaves'], m: { en: 'Make food by photosynthesis and let gases in and out through stomata.', hi: 'प्रकाश-संश्लेषण से भोजन बनाती हैं और रंध्रों से गैसों का आदान-प्रदान करती हैं।', pa: 'ਪ੍ਰਕਾਸ਼-ਸੰਸ਼ਲੇਸ਼ਣ ਨਾਲ ਭੋਜਨ ਬਣਾਉਂਦੇ ਹਨ ਤੇ ਸਟੋਮੈਟਾ ਰਾਹੀਂ ਗੈਸਾਂ ਦਾ ਲੈਣ-ਦੇਣ ਕਰਦੇ ਹਨ।' } },
  { names: ['stomata', 'stoma'], m: { en: 'Tiny pores on the leaf that let gases in and out.', hi: 'पत्ती के सूक्ष्म छिद्र जिनसे गैसें आती-जाती हैं।', pa: 'ਪੱਤੇ ਦੇ ਸੂਖਮ ਛੇਕ ਜਿਨ੍ਹਾਂ ਰਾਹੀਂ ਗੈਸਾਂ ਆਉਂਦੀਆਂ-ਜਾਂਦੀਆਂ ਹਨ।' } },
  { names: ['xylem'], m: { en: 'Carries water and minerals up from the roots.', hi: 'जड़ों से पानी और खनिज ऊपर ले जाता है।', pa: 'ਜੜ੍ਹਾਂ ਤੋਂ ਪਾਣੀ ਤੇ ਖਣਿਜ ਉੱਪਰ ਲੈ ਜਾਂਦਾ ਹੈ।' } },
  { names: ['phloem'], m: { en: 'Carries food made in the leaves to the rest of the plant.', hi: 'पत्तियों में बना भोजन पूरे पौधे तक पहुँचाता है।', pa: 'ਪੱਤਿਆਂ ਵਿੱਚ ਬਣਿਆ ਭੋਜਨ ਪੂਰੇ ਪੌਦੇ ਤੱਕ ਪਹੁੰਚਾਉਂਦਾ ਹੈ।' } },
]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
const index = new Map<string, Meaning>()
for (const e of G) for (const n of e.names) index.set(norm(n), e.m)

/** The glossary's sentence for a part name, or null. Exact name first, then the longest glossary name contained in it. */
export function glossaryMeaning(name: string): Meaning | null {
  const n = norm(name)
  if (!n) return null
  if (index.has(n)) return index.get(n)!
  let best: { len: number; m: Meaning } | null = null
  for (const [k, m] of index) if (k.length >= 4 && (n.includes(k) || k.includes(n)) && (!best || k.length > best.len)) best = { len: k.length, m }
  return best?.m ?? null
}
export const GLOSSARY_SIZE = G.length
export function meaningIn(el: { meaning?: string; meanings?: Partial<Record<Lang, string>> }, lang: Lang): string | undefined { return el.meanings?.[lang] ?? el.meaning }
