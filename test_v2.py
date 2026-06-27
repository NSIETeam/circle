import urllib.request, json

# Login
login_data = json.dumps({"phone":"admin","password":"admin123"}).encode()
login_req = urllib.request.Request('http://localhost:3001/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
token = json.loads(urllib.request.urlopen(login_req).read())['data']['token']

# Test 1: 生物医药 — 电力和配套是生死线
print('=' * 60)
print('TEST 1: 生物医药客户（电力3000KVA + 污水处理）')
print('=' * 60)
match_data = json.dumps({
    "industry": "生物医药",
    "min_area": 1000,
    "max_area": 3000,
    "max_rent": 6.0,
    "min_height": 4,
    "min_load": 2,
    "min_power": 3000
}).encode()
match_req = urllib.request.Request('http://localhost:3001/api/recommend/match', data=match_data, headers={
    'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token
})
resp = json.loads(urllib.request.urlopen(match_req).read())
print('Excluded:', resp.get('excluded_count', 0), 'houses filtered out')
print('Matched:', resp['total'], 'houses')
for i, r in enumerate(resp['data'], 1):
    b = r['building']
    print('\n%d. %s | Score: %d' % (i, b['name'], r['score']))
    print('   Power: %sKVA | Load: %sT | Area: %s' % (b.get('total_area','?'), b['floor_load'], b['total_area']))
    for reason in r['reasons']:
        print('   > %s' % reason)

# Test 2: 智能制造 — 承重和层高是关键
print('\n' + '=' * 60)
print('TEST 2: 智能制造客户（承重8T + 层高7m）')
print('=' * 60)
match_data2 = json.dumps({
    "industry": "智能制造",
    "min_area": 3000,
    "max_area": 10000,
    "max_rent": 3.5,
    "min_height": 7,
    "min_load": 8,
    "min_power": 3000
}).encode()
match_req2 = urllib.request.Request('http://localhost:3001/api/recommend/match', data=match_data2, headers={
    'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token
})
resp2 = json.loads(urllib.request.urlopen(match_req2).read())
print('Excluded:', resp2.get('excluded_count', 0), 'houses filtered out')
print('Matched:', resp2['total'], 'houses')
for i, r in enumerate(resp2['data'], 1):
    b = r['building']
    print('\n%d. %s | Score: %d' % (i, b['name'], r['score']))
    print('   Height: %sm | Load: %sT | Area: %s' % (b['floor_height'], b['floor_load'], b['total_area']))
    for reason in r['reasons']:
        print('   > %s' % reason)

# Test 3: AI产业 — 面积和预算为主
print('\n' + '=' * 60)
print('TEST 3: AI产业客户（2000-5000㎡ + 预算4元）')
print('=' * 60)
match_data3 = json.dumps({
    "industry": "AI",
    "min_area": 2000,
    "max_area": 5000,
    "max_rent": 4.0,
    "min_height": 5,
    "min_load": 3,
    "min_power": 1000,
    "region": "昌平区"
}).encode()
match_req3 = urllib.request.Request('http://localhost:3001/api/recommend/match', data=match_data3, headers={
    'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token
})
resp3 = json.loads(urllib.request.urlopen(match_req3).read())
print('Excluded:', resp3.get('excluded_count', 0), 'houses filtered out')
print('Matched:', resp3['total'], 'houses')
for i, r in enumerate(resp3['data'], 1):
    b = r['building']
    print('\n%d. %s | Score: %d' % (i, b['name'], r['score']))
    print('   Area: %s | Rent: %s~%s | Region: %s' % (b['total_area'], b['rent_min'], b['rent_max'], b['region']))
    for reason in r['reasons']:
        print('   > %s' % reason)
