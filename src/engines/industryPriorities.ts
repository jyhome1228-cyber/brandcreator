import type { IndustryId } from './industryRecommendations';

/**
 * Preliminary practice-oriented hypotheses; NOT validated conclusions from the
 * planned 22-brand literature/case analysis. No mandatory industry standard is
 * claimed. All industries receive BRAMER's same 17 base production items.
 */
export type IndustryPriority = {
  context: string;
  important: { title:string; why:string; output:string }[];
  optional: { title:string; condition:string }[];
  beyond: { title:string; reason:string }[];
  check: string[];
};

export const INDUSTRY_PRIORITIES: Record<IndustryId,IndustryPriority> = {
  fintech: {
    context:'신뢰도와 정보의 정확성이 중요하고, 작은 화면에서 서비스명이 반복 노출되는 업종입니다. 실제 금융 서비스의 필수 고지·접근성 기준은 별도 검토해야 합니다.',
    important:[
      {title:'로고 최소 크기·보호 공간',why:'앱 및 제휴 화면에서 로고가 축소되어도 식별되어야 합니다.',output:'Logo Grid · Clear Space · Minimum Size'},
      {title:'색상 대비와 단색 버전',why:'작은 텍스트 및 배경이 바뀌는 접점에서 오독을 줄여야 합니다.',output:'Monochromatic · Color Contrast'},
      {title:'정보 전달 서체 위계',why:'금액·안내 문구 등의 중요도를 명확하게 구분해야 합니다.',output:'Title · Body Typography'},
      {title:'신뢰감 있는 브랜드 메시지',why:'서비스 설명과 대표 문구의 표현을 일관되게 유지합니다.',output:'Brand Overview · Brand Message'}
    ],
    optional:[{title:'레터헤드·봉투',condition:'고객 대상 공식 문서나 우편 업무가 있을 때 우선 활용'},{title:'명함·스티커',condition:'오프라인 제휴·행사 등 업무가 있으면 활용'}],
    beyond:[{title:'앱 UI 컴포넌트·아이콘',reason:'UI 설계 자료가 없어 로고만으로 확정 불가'},{title:'금융 규제 문구',reason:'별도 법률 및 정책 검토 필요'}],
    check:['화면 크기를 줄여도 로고 식별이 가능한가?','강조색을 사용하더라도 주요 정보의 대비가 충분한가?','사용자가 입력한 문구가 실제 승인된 표현인가?']
  },
  commerce: {
    context:'브랜드가 스토어·상품 페이지·프로모션에 반복 노출되므로 다양한 채널에서 로고와 컬러의 일관성이 중요합니다.',
    important:[
      {title:'로고 기본형·최소 크기',why:'스토어 헤더와 작은 상품 이미지의 크기 차이에 대응합니다.',output:'Primary Logo · Minimum Size'},
      {title:'브랜드 컬러·조합·대비',why:'상업적 강조색과 브랜드 색상을 혼동하지 않도록 합니다.',output:'Brand Colors · Color Combinations · Contrast'},
      {title:'텍스트 위계',why:'상품명과 혜택 정보 등 읽기 순서를 정리합니다.',output:'Title · Body Typography'},
      {title:'브랜드 메시지',why:'채널별 소개 및 판매 문구의 기본 표현을 정리합니다.',output:'Brand Overview · Brand Message'}
    ],
    optional:[{title:'로고 스티커',condition:'포장·배송 상자에 로고 부착이 필요할 때'},{title:'명함·봉투',condition:'B2B·오프라인 유통 업무가 있을 때'}],
    beyond:[{title:'상품 사진·상세페이지',reason:'제품 이미지와 구성 자료가 있어야 함'},{title:'실물 패키지 설계',reason:'제품 규격과 전개도 필요'}],
    check:['스토어와 패키지에 같은 로고 파일을 쓰는가?','원본 로고색이 상품 배경에서도 보이는가?','판매 프로모션 그래픽을 브랜드 공식 규칙으로 혼동하지 않는가?']
  },
  beauty: {
    context:'작은 라벨과 넓은 패키지에서 로고가 반복되므로, 세부 획과 컬러 재현을 특히 주의해야 합니다.',
    important:[
      {title:'로고 보호 공간과 최소 크기',why:'라벨·용기 등 공간이 작을 때 읽기 어려워질 수 있습니다.',output:'Logo Grid · Clear Space · Minimum Size'},
      {title:'단색·컬러 조합',why:'밝고 어두운 패키지 표면에서 가독성을 유지해야 합니다.',output:'Monochromatic · Color Combinations'},
      {title:'브랜드 컬러값',why:'패키지 인쇄와 웹 표현의 색상 차이를 관리하기 위한 출발점입니다.',output:'Brand Colors'},
      {title:'브랜드 스토리 및 서체',why:'브랜드 소개와 제목·본문의 분위기를 통일합니다.',output:'Overview · Typography · Brand Message'}
    ],
    optional:[{title:'로고 스티커',condition:'포장 봉인·프로모션에 필요한 경우'},{title:'명함·레터헤드',condition:'바이어·협력사 문서가 필요한 경우'}],
    beyond:[{title:'제품 라벨 법정 표기',reason:'제품별 용량·전성분·표시사항 검토가 필요'},{title:'촬영 스타일·패키지 디자인',reason:'제품 이미지 및 별도 소재 원본 필요'}],
    check:['최소 로고 크기에서 세부 획이 유지되는가?','인쇄 컬러값이 시뮬레이션이 아닌 인쇄 조건에 적합한가?','선택된 단색 로고는 브랜드 승인 버전인가?']
  },
  content: {
    context:'다양한 콘텐츠 유형에서 제목과 로고가 함께 쓰입니다. 브랜드의 기본 규정과 콘텐츠별 개별 디자인은 구분하는 편이 좋습니다.',
    important:[
      {title:'로고 크기·영역',why:'작은 썸네일에서도 로고가 인식되어야 합니다.',output:'Primary Logo · Minimum Size'},
      {title:'브랜드 컬러와 대비',why:'서로 다른 콘텐츠 배경에 적용할 때 식별성을 유지합니다.',output:'Color Combinations · Color Contrast'},
      {title:'제목 서체 위계',why:'짧은 타이틀 중심의 콘텐츠에 일관성을 줍니다.',output:'Title Typography'},
      {title:'대표 메시지',why:'매체가 달라져도 브랜드가 전달하려는 방향을 유지합니다.',output:'Brand Message'}
    ],
    optional:[{title:'로고 스티커',condition:'행사나 굿즈를 제작할 때'},{title:'명함',condition:'출판·콘텐츠 협업 업무가 있을 때'}],
    beyond:[{title:'모션·영상·콘텐츠 썸네일',reason:'영상 원본과 콘텐츠별 화면 필요'},{title:'이미지 촬영 규칙',reason:'실제 이미지 사례 검토 필요'}],
    check:['콘텐츠 배경이 다양해져도 로고 가독성이 유지되는가?','제목 스타일이 브랜드 규칙과 혼동되지 않는가?','모션은 본 제작 도구의 기본 범위에서 제외되었는가?']
  },
  mobility: {
    context:'차량·사인·앱 등 관찰 거리와 사용 환경이 달라질 수 있습니다. 실제 물리 매체 적용은 규격 자료가 따로 필요합니다.',
    important:[
      {title:'로고 비율·보호 공간',why:'크고 작은 매체에서 동일한 비율을 유지합니다.',output:'Logo Grid · Clear Space'},
      {title:'최소 크기 검토',why:'원거리 및 소형 UI에서의 로고 식별 기준이 다릅니다.',output:'Minimum Size'},
      {title:'배경 대비',why:'차량 외장이나 실외 사인의 배경색과 충돌하지 않아야 합니다.',output:'Monochromatic · Color Contrast'},
      {title:'기본 서체 및 브랜드 메시지',why:'안내·문서에서 혼란을 줄이기 위한 기본 위계를 제공합니다.',output:'Typography · Brand Message'}
    ],
    optional:[{title:'레터헤드·봉투',condition:'운영·계약 문서에 사용'},{title:'명함',condition:'제휴 및 사업 운영에 사용'}],
    beyond:[{title:'차량 래핑·사인 제작',reason:'실측 도면·소재·시공 조건 필요'},{title:'안전·교통 안내체계',reason:'관련 법규와 실제 서비스 이용 조건 검토 필요'}],
    check:['원거리에서도 식별되는지 현장 검증 계획이 있는가?','리버스 로고가 브랜드 승인된 방식인가?','차량/사인 파일을 로고 하나만으로 자동 완성했다고 표시하지 않는가?']
  },
  service: {
    context:'앱과 웹에서의 일관된 식별성과 안내 문장 톤이 중요합니다. BRAMER는 로고·색상·서체 규칙을 제공하며 실제 UI 설계는 별도 작업입니다.',
    important:[
      {title:'디지털 최소 크기',why:'서비스 페이지 상단이나 안내 영역에서 로고가 작게 표현됩니다.',output:'Primary Logo · Minimum Size'},
      {title:'배경 대비와 컬러 체계',why:'앱·웹 환경에서 브랜드 색상이 바뀌더라도 시인성을 유지합니다.',output:'Brand Colors · Color Contrast'},
      {title:'서체·정보 위계',why:'서비스 안내 문구와 제목의 가독성을 확보합니다.',output:'Title · Body Typography'},
      {title:'문구 일관성',why:'고객 안내 및 소개 내용의 표현을 통일합니다.',output:'Brand Overview · Brand Message'}
    ],
    optional:[{title:'명함·봉투',condition:'오프라인 운영이나 제휴 업무가 있을 때'},{title:'스티커',condition:'브랜드 오프라인 행사가 있을 때'}],
    beyond:[{title:'앱 UI · 고객센터 화면',reason:'실제 화면 설계 자료 필요'},{title:'알림 메시지 시스템',reason:'서비스 흐름 및 메시지 원문 검토 필요'}],
    check:['가이드라인은 UI 전체가 아닌 기본 BI 규칙이라는 점이 명확한가?','사용자 안내 문구의 정식 버전이 입력되었는가?','밝고 어두운 배경 모두 로고가 명확한가?']
  },
  technology: {
    context:'기술 설명 자료의 일관성과 다양한 디지털 제품 접점에서의 로고·서체 활용이 중요합니다.',
    important:[
      {title:'로고 비율 및 최소 크기',why:'웹·제품 UI·문서에서 반복되는 로고의 규격을 정리합니다.',output:'Logo Grid · Minimum Size'},
      {title:'브랜드 컬러와 대비',why:'기술 문서와 서비스 화면에서 색상을 일관되게 적용합니다.',output:'Brand Colors · Color Contrast'},
      {title:'서체 위계',why:'기능과 설명 사이의 중요도를 구분합니다.',output:'Title · Body Typography'},
      {title:'기술 용어·메시지',why:'기업 설명 문구를 일관된 톤으로 정리합니다.',output:'Brand Overview · Brand Message'}
    ],
    optional:[{title:'레터헤드·명함',condition:'영업 및 제휴 문서 사용 시'},{title:'스티커',condition:'장비·판촉 부착용 별도 검토 시'}],
    beyond:[{title:'기술 다이어그램·아이콘',reason:'기술 데이터와 원본 그래픽 필요'},{title:'UI 상태·컴포넌트',reason:'제품 디자인 시스템 설계 필요'}],
    check:['설명 문구가 실제 기술 사실과 일치하는가?','웹과 문서에 동일한 로고 버전이 쓰이는가?','기술 도식을 자동으로 생성했다고 오해하지 않는가?']
  },
  corporate: {
    context:'기업 문서·명함·봉투에서 동일한 시각체계를 반복 사용하므로 실무 서식의 활용성이 상대적으로 높습니다.',
    important:[
      {title:'원본 로고·보호 공간',why:'여러 부서와 제작 업체에서 로고 형태를 일관되게 유지해야 합니다.',output:'Primary Logo · Clear Space'},
      {title:'공식 컬러 및 흑백 변형',why:'다양한 인쇄·문서 환경에 맞춰 읽히는 색상을 사용합니다.',output:'Brand Colors · Monochromatic'},
      {title:'공식 문서용 서체',why:'레터헤드 및 제안서의 표현 위계를 정리합니다.',output:'Typography'},
      {title:'명함·공문서 응용',why:'반복 활용하는 인쇄/문서 매체의 기본 구조를 제공합니다.',output:'Business Card · Letterhead · Envelope'}
    ],
    optional:[{title:'로고 스티커',condition:'발송·전시·행사용 자산이 있을 때'}],
    beyond:[{title:'사인·차량·제품 표기',reason:'실측 도면, 소재와 제작 사양 필요'},{title:'기업 사진 스타일',reason:'기존 촬영물과 운영 목적 검토 필요'}],
    check:['담당자 연락처와 회사 주소가 최신 정보인가?','봉투·명함 규격은 실제 인쇄소 사양에 맞는가?','부서별 승인 로고 원본을 확보했는가?']
  }
};
