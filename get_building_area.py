import requests
import pandas as pd
import time

# -----------------------------------------------------------------
# ⚠️ [1] 여기에 발급받은 API 키를 입력하세요. (2개)
# -----------------------------------------------------------------
# 1. 행정안전부 '주소정보제공 API' (juso.go.kr) 일반 인증키
JUSO_API_KEY = "YOUR_JUSO_API_KEY_HERE"

# 2. 국토교통부 '건축물대장정보 API' (data.go.kr) 일반 인증키 (URL 디코딩된 키)
#    (data.go.kr에서 받은 키가 % 등으로 인코딩되어 있다면, URL 디코딩해서 넣어야 함)
BUILDING_API_KEY = "YOUR_BUILDING_API_KEY_HERE"
# -----------------------------------------------------------------


def get_bdMgtSn(api_key, road_addr):
    """
    [1단계] 도로명 주소로 건축물관리번호(bdMgtSn)를 조회하는 함수
    """
    api_url = "https://www.juso.go.kr/addrlink/addrLinkApi.do"
    params = {
        "confmKey": api_key,
        "currentPage": 1,
        "countPerPage": 1,
        "keyword": road_addr,
        "resultType": "json"
    }
    
    try:
        response = requests.get(api_url, params=params)
        response.raise_for_status() # 오류가 있으면 예외 발생
        
        data = response.json()
        
        if data['results']['common']['errorCode'] != '0':
            print(f"  [주소 API 오류] {data['results']['common']['errorMessage']}")
            return None
            
        if not data['results']['juso']:
            print(f"  [주소 API] '{road_addr}' 검색 결과 없음")
            return None
            
        # 첫 번째 검색 결과의 건축물관리번호 반환
        return data['results']['juso'][0]['bdMgtSn']
        
    except requests.RequestException as e:
        print(f"  [주소 API 요청 실패] {e}")
        return None
    except KeyError:
        print(f"  [주소 API 응답 파싱 실패] 응답 구조가 예상과 다름")
        return None


def get_building_info(api_key, bdMgtSn):
    """
    [2단계] 건축물관리번호로 대지면적(platArea)과 연면적(totArea)을 조회하는 함수
    """
    api_url = "http://apis.data.go.kr/1613000/BldRgstService_v2/getBldRgstBrTitleInfo"
    params = {
        "serviceKey": api_key,
        "bdMgtSn": bdMgtSn,
        "_type": "json", # XML 대신 JSON으로 응답 받기
        "numOfRows": 1,
        "pageNo": 1
    }
    
    try:
        response = requests.get(api_url, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        # API가 성공 코드 '00'을 반환했는지 확인
        if data['response']['header']['resultCode'] != '00':
            print(f"  [건축물 API 오류] {data['response']['header']['resultMsg']}")
            return None, None

        # 데이터가 비어있는지 확인
        if 'items' not in data['response']['body'] or not data['response']['body']['items']:
            print(f"  [건축물 API] {bdMgtSn}에 대한 정보 없음")
            return None, None

        item = data['response']['body']['items']['item']
        
        # 'item'이 리스트일 경우 첫 번째 항목 사용 (보통 단일 항목)
        if isinstance(item, list):
            item = item[0]
            
        platArea = item.get('platArea', 0.0)  # 대지면적
        totArea = item.get('totArea', 0.0)   # 연면적 (총 연면적)
        
        return float(platArea), float(totArea)

    except requests.RequestException as e:
        print(f"  [건축물 API 요청 실패] {e}")
        return None, None
    except (KeyError, TypeError, ValueError) as e:
        print(f"  [건축물 API 응답 파싱 실패] {e}")
        return None, None

# --- 메인 실행 로직 ---

# 1. 예제 데이터 (이 부분을 실제 데이터로 교체하세요)
#    (빈집 데이터셋에서 '소재지(도로명)' 열을 가져왔다고 가정)
addresses = [
    "서울특별시 종로구 사직로 161",  # 경복궁 (예시)
    "서울특별시 중구 세종대로 110",  # 서울특별시청 (예시)
    "부산광역시 해운대구 달맞이길 62번길 38", # 가상 주소 (오류 테스트용)
]
df = pd.DataFrame(addresses, columns=['도로명주소'])


# 2. 결과를 저장할 리스트 생성
plat_areas = []  # 대지면적
tot_areas = []   # 연면적

# 3. DataFrame의 각 주소를 순회하며 API 호출
for addr in df['도로명주소']:
    print(f"--- 처리 중: {addr} ---")
    
    # [1단계] 주소 -> 건축물관리번호
    bdMgtSn = get_bdMgtSn(JUSO_API_KEY, addr)
    
    plat_area = None
    tot_area = None
    
    if bdMgtSn:
        # [2단계] 건축물관리번호 -> 면적 정보
        # (참고: 정부 API는 초당/일일 트래픽 제한이 있으므로, 
        #  대량 데이터 처리 시 time.sleep(0.1) 등을 추가하는 것이 안정적입니다.)
        # time.sleep(0.1) 
        plat_area, tot_area = get_building_info(BUILDING_API_KEY, bdMgtSn)

    # 결과 리스트에 추가
    plat_areas.append(plat_area)
    tot_areas.append(tot_area)

# 4. DataFrame에 새로운 열로 추가
df['대지면적(㎡)'] = plat_areas
df['연면적(㎡)'] = tot_areas

# 5. 최종 결과 출력
print("\n--- 최종 결과 ---")
print(df)