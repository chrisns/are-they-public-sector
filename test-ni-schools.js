// Quick test of NI schools functionality
import { NISchoolsParser } from './src/services/ni-schools-parser.ts';
import { NISchoolsMapper } from './src/services/mappers/ni-schools-mapper.ts';

console.log('Testing NI Schools integration...\n');

async function test() {
  try {
    // Create instances
    const parser = new NISchoolsParser();
    const mapper = new NISchoolsMapper();

    console.log('1. Fetching NI schools data...');
    const startTime = Date.now();
    const rawSchools = await parser.parse();
    const fetchTime = Date.now() - startTime;

    console.log(`   ✓ Fetched ${rawSchools.length} schools in ${fetchTime}ms`);

    // Check count
    if (rawSchools.length >= 1010 && rawSchools.length <= 1234) {
      console.log(`   ✓ Count validation passed (expected ~1122, got ${rawSchools.length})`);
    } else {
      console.log(`   ✗ Count validation failed (expected ~1122, got ${rawSchools.length})`);
    }

    console.log('\n2. Mapping to Organisation format...');
    const organisations = mapper.mapMany(rawSchools);
    console.log(`   ✓ Mapped ${organisations.length} organisations`);

    // Sample some data
    console.log('\n3. Sample data:');
    const sample = organisations.slice(0, 3);
    sample.forEach((org, i) => {
      console.log(`   School ${i + 1}:`);
      console.log(`   - Name: ${org.name}`);
      console.log(`   - Type: ${org.additionalProperties?.subcategory || org.classification}`);
      console.log(`   - Location: ${org.location?.region || 'N/A'}`);
    });

    // Check school types distribution
    console.log('\n4. School types distribution:');
    const types = {};
    organisations.forEach(org => {
      const type = org.additionalProperties?.subcategory || org.classification;
      types[type] = (types[type] || 0) + 1;
    });
    Object.entries(types).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();