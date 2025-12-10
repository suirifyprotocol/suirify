const fs = require('fs');
const path = require('path');

const govMockDB = {
    Nigeria: {
        'NGA-00000000000': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000000',
            fullName: 'Suirify Devnet Test',
            givenName: 'Suirify Devnet',
            familyName: 'Test',
            dateOfBirth: '2010-01-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-00000000001': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000000',
            fullName: 'Suirify Devnet Enclave',
            givenName: 'Enclave Devnet',
            familyName: 'Enclave',
            dateOfBirth: '2004-01-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-00000000002': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000002',
            fullName: 'Suirify Devnet Enclave2',
            givenName: 'Enclave2 Devnet',
            familyName: 'Enclave2',
            dateOfBirth: '2006-02-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-00000000003': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000003',
            fullName: 'Suirify Devnet Enclave3',
            givenName: 'Enclave3 Devnet',
            familyName: 'Enclave3',
            dateOfBirth: '2000-03-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2020-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-00000000004': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000004',
            fullName: 'Suirify Devnet Enclave4',
            givenName: 'Enclave4 Devnet',
            familyName: 'Enclave4',
            dateOfBirth: '2008-04-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-00000000005': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000005',
            fullName: 'Suirify Devnet Enclave5',
            givenName: 'Enclave5 Devnet',
            familyName: 'Enclave5',
            dateOfBirth: '1998-05-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-00000000006': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000006',
            fullName: 'Suirify Devnet Enclave6',
            givenName: 'Enclave6 Devnet',
            familyName: 'Enclave6',
            dateOfBirth: '2017-06-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-00000000007': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000007',
            fullName: 'Suirify Devnet Enclave7',
            givenName: 'Enclave7 Devnet',
            familyName: 'Enclave7',
            dateOfBirth: '2001-07-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-00000000008': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000008',
            fullName: 'Suirify Devnet Enclave8',
            givenName: 'Enclave8 Devnet',
            familyName: 'Enclave8',
            dateOfBirth: '2003-08-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-00000000009': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-00000000009',
            fullName: 'Suirify Devnet Enclave9',
            givenName: 'Enclave9 Devnet',
            familyName: 'Enclave9',
            dateOfBirth: '2002-09-01',
            gender: 'unspecified',
            nationality: 'Nigerian',
            address: 'Suirify Lab, Devnet',
            issuingAuthority: 'Suirify Test Authority',
            issuanceDate: '2024-01-01',
            expiryDate: null,
            photoReference: null,
            biometricHash: 'hash_suirify_devnet',
            mrz: null,
            barcodeData: 'barcode_suirify_devnet',
            additionalNotes: 'Internal record for automated testing'
        },
        'NGA-10000000001': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-10000000001',
            fullName: 'Sambo Flourish Simon',
            givenName: 'Sambo Flourish',
            familyName: 'Simon',
            dateOfBirth: '2004-01-01',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'No. 12, Lagos Ave, Abuja',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2018-06-01',
            expiryDate: null,
            photoReference: '/reference_photos/NGA-12345678901.jpg',
            biometricHash: 'hash_example_1',
            mrz: null,
            barcodeData: 'barcode_ng_123',
            additionalNotes: 'Verified against NIMC'
        },
        'NGA-10987654321': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-10987654321',
            fullName: 'Isaac Benedict',
            givenName: 'Isaac',
            familyName: 'Benedict',
            dateOfBirth: '2005-04-24',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'Flat 2B, Ibadan Street, Oyo',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2022-01-10',
            expiryDate: null,
            photoReference: '/reference_photos/NGA-10987654321',
            biometricHash: 'hash_example_2',
            mrz: null,
            barcodeData: 'barcode_ng_109',
            additionalNotes: 'Minor - parental consent on file'
        },
        'NGA-11223344556': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-11223344556',
            fullName: 'Bari-Domaka Pop-Yornwin',
            givenName: 'Bari-Domaka',
            familyName: 'Pop-Yornwin',
            dateOfBirth: '2006-10-10',
            gender: 'female',
            nationality: 'Nigerian',
            address: 'House 7, Port Harcourt Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2020-03-05',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-11223344556.png',
            biometricHash: 'hash_example_3',
            mrz: null,
            barcodeData: 'barcode_ng_112',
            additionalNotes: ''
        },
        'NGA-12345678902': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678902',
            fullName: 'Jerome',
            givenName: 'Gozi',
            familyName: 'Yaro',
            dateOfBirth: '2006-11-05',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'House 9, Abuja Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2021-04-06',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-.png',
            biometricHash: 'hash_example_4',
            mrz: null,
            barcodeData: 'barcode_ng_113',
            additionalNotes: ''
        },
        'NGA-12345678903': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678903',
            fullName: 'Suirify',
            givenName: '',
            familyName: 'Protocol',
            dateOfBirth: '2025-11-20',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'House 9, Abuja Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2025-11-20',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-5.png',
            biometricHash: 'hash_example_5',
            mrz: null,
            barcodeData: 'barcode_ng_115',
            additionalNotes: ''
        },
        'NGA-12345678904': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678904',
            fullName: 'Suirify',
            givenName: 'Test2',
            familyName: 'Protocol',
            dateOfBirth: '2025-11-20',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'House 10, Minna Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2025-11-20',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-6.png',
            biometricHash: 'hash_example_6',
            mrz: null,
            barcodeData: 'barcode_ng_116',
            additionalNotes: ''
        },
        'NGA-12345678905': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678905',
            fullName: 'Suirify',
            givenName: 'Test3',
            familyName: 'Protocol',
            dateOfBirth: '2025-11-20',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'House 11, Minna Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2025-11-20',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-7.png',
            biometricHash: 'hash_example_7',
            mrz: null,
            barcodeData: 'barcode_ng_117',
            additionalNotes: ''
        },
        'NGA-12345678907': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678906',
            fullName: 'Hisham',
            givenName: 'Tijani',
            familyName: 'Ahmed',
            dateOfBirth: '2000-07-04',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'House 12, Abuja Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2025-11-22',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-7.png',
            biometricHash: 'hash_example_9',
            mrz: null,
            barcodeData: 'barcode_ng_119',
            additionalNotes: ''
        },
        'NGA-12345678906': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678906',
            fullName: 'Rita',
            givenName: 'Ojimaojo',
            familyName: 'Akubo',
            dateOfBirth: '2006-07-04',
            gender: 'female',
            nationality: 'Nigerian',
            address: 'House 12, Abuja Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2025-11-22',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-7.png',
            biometricHash: 'hash_example_8',
            mrz: null,
            barcodeData: 'barcode_ng_118',
            additionalNotes: ''
        },
        'NGA-12345678908': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678906',
            fullName: 'Micheal',
            givenName: '',
            familyName: 'Obe',
            dateOfBirth: '1970-01-01',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'House 12, Abuja Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2025-11-22',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-7.png',
            biometricHash: 'hash_example_20',
            mrz: null,
            barcodeData: 'barcode_ng_120',
            additionalNotes: ''
        },
        'NGA-12345678909': {
            country: 'Nigeria',
            documentType: 'national_id',
            idNumber: 'NGA-12345678906',
            fullName: 'George',
            givenName: 'Junior',
            familyName: 'Alainengiya',
            dateOfBirth: '1980-01-01',
            gender: 'male',
            nationality: 'Nigerian',
            address: 'House 12, Abuja Rd',
            issuingAuthority: 'National Identity Management Commission',
            issuanceDate: '2025-11-22',
            expiryDate: null,
            // Use a hosted avatar as the reference photo so the backend can fetch it
            photoReference: '/reference_photos/NGA-7.png',
            biometricHash: 'hash_example_20',
            mrz: null,
            barcodeData: 'barcode_ng_120',
            additionalNotes: ''
        }
    },

    Ghana: {
      'GHA-123456789': {
        country: 'Ghana',
        documentType: 'ghana_card',
        idNumber: 'GHA-123456789',
        fullName: 'Kwame Nkrumah',
        givenName: 'Kwame',
        familyName: 'Nkrumah',
        dateOfBirth: '1930-09-21',
        gender: 'male',
        nationality: 'Ghanaian',
        address: 'Accra, Ghana',
        issuingAuthority: 'Ghana Card Authority',
        issuanceDate: '1957-03-06',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_example_gh_1',
        mrz: null,
        barcodeData: 'barcode_gh_A123',
        additionalNotes: 'Historic record (example)'
      },
      'GHA-987654321': {
        country: 'Ghana',
        documentType: 'ghana_card',
        idNumber: 'GHA-987654321',
        fullName: 'Ama Serwaa',
        givenName: 'Ama',
        familyName: 'Serwaa',
        dateOfBirth: '1995-05-10',
        gender: 'female',
        nationality: 'Ghanaian',
        address: 'Kumasi, Ghana',
        issuingAuthority: 'Ghana Card Authority',
        issuanceDate: '2015-08-20',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_example_gh_2',
        mrz: null,
        barcodeData: 'barcode_gh_B456',
        additionalNotes: ''
      },
      'GHA-555666777': {
        country: 'Ghana',
        documentType: 'ghana_card',
        idNumber: 'GHA-555666777',
        fullName: 'Yaw Mensah',
        givenName: 'Yaw',
        familyName: 'Mensah',
        dateOfBirth: '1988-12-01',
        gender: 'male',
        nationality: 'Ghanaian',
        address: 'Takoradi, Ghana',
        issuingAuthority: 'Ghana Card Authority',
        issuanceDate: '2018-03-15',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_example_gh_3',
        mrz: null,
        barcodeData: 'barcode_gh_C789',
        additionalNotes: ''
      }
    },
    "United States": {
      'SSN-123-45-6789': {
        country: 'United States',
        documentType: 'ssn',
        idNumber: '123-45-6789',
        fullName: 'John Smith',
        givenName: 'John',
        familyName: 'Smith',
        dateOfBirth: '1980-07-15',
        gender: 'male',
        nationality: 'American',
        address: '123 Main St, New York, NY',
        issuingAuthority: 'Social Security Administration',
        issuanceDate: '1998-01-01',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_us_1',
        mrz: null,
        barcodeData: 'barcode_us_1',
        additionalNotes: ''
      },
      'SSN-987-65-4321': {
        country: 'United States',
        documentType: 'ssn',
        idNumber: '987-65-4321',
        fullName: 'Jane Doe',
        givenName: 'Jane',
        familyName: 'Doe',
        dateOfBirth: '1992-03-22',
        gender: 'female',
        nationality: 'American',
        address: '456 Elm St, Los Angeles, CA',
        issuingAuthority: 'Social Security Administration',
        issuanceDate: '2010-05-10',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_us_2',
        mrz: null,
        barcodeData: 'barcode_us_2',
        additionalNotes: ''
      },
      'SSN-555-66-7777': {
        country: 'United States',
        documentType: 'ssn',
        idNumber: '555-66-7777',
        fullName: 'Alice Johnson',
        givenName: 'Alice',
        familyName: 'Johnson',
        dateOfBirth: '1975-11-30',
        gender: 'female',
        nationality: 'American',
        address: '789 Oak St, Chicago, IL',
        issuingAuthority: 'Social Security Administration',
        issuanceDate: '1993-09-15',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_us_3',
        mrz: null,
        barcodeData: 'barcode_us_3',
        additionalNotes: ''
      }
    },
    "South Africa": {
      'SA-8001015009087': {
        country: 'South Africa',
        documentType: 'national_id',
        idNumber: '8001015009087',
        fullName: 'Sipho Dlamini',
        givenName: 'Sipho',
        familyName: 'Dlamini',
        dateOfBirth: '1980-01-01',
        gender: 'male',
        nationality: 'South African',
        address: 'Cape Town, South Africa',
        issuingAuthority: 'Department of Home Affairs',
        issuanceDate: '2000-02-15',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_sa_1',
        mrz: null,
        barcodeData: 'barcode_sa_1',
        additionalNotes: ''
      },
      'SA-9002026009088': {
        country: 'South Africa',
        documentType: 'national_id',
        idNumber: '9002026009088',
        fullName: 'Thandi Nkosi',
        givenName: 'Thandi',
        familyName: 'Nkosi',
        dateOfBirth: '1990-02-02',
        gender: 'female',
        nationality: 'South African',
        address: 'Johannesburg, South Africa',
        issuingAuthority: 'Department of Home Affairs',
        issuanceDate: '2010-06-10',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_sa_2',
        mrz: null,
        barcodeData: 'barcode_sa_2',
        additionalNotes: ''
      },
      'SA-8503037009089': {
        country: 'South Africa',
        documentType: 'national_id',
        idNumber: '8503037009089',
        fullName: 'Lebo Mokoena',
        givenName: 'Lebo',
        familyName: 'Mokoena',
        dateOfBirth: '1985-03-03',
        gender: 'male',
        nationality: 'South African',
        address: 'Durban, South Africa',
        issuingAuthority: 'Department of Home Affairs',
        issuanceDate: '2005-11-20',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_sa_3',
        mrz: null,
        barcodeData: 'barcode_sa_3',
        additionalNotes: ''
      }
    },
    "India": {
      'AADHAAR-234567890123': {
        country: 'India',
        documentType: 'aadhaar',
        idNumber: '234567890123',
        fullName: 'Rahul Sharma',
        givenName: 'Rahul',
        familyName: 'Sharma',
        dateOfBirth: '1990-04-15',
        gender: 'male',
        nationality: 'Indian',
        address: 'Delhi, India',
        issuingAuthority: 'UIDAI',
        issuanceDate: '2010-07-01',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_in_1',
        mrz: null,
        barcodeData: 'barcode_in_1',
        additionalNotes: ''
      },
      'AADHAAR-345678901234': {
        country: 'India',
        documentType: 'aadhaar',
        idNumber: '345678901234',
        fullName: 'Priya Singh',
        givenName: 'Priya',
        familyName: 'Singh',
        dateOfBirth: '1985-09-10',
        gender: 'female',
        nationality: 'Indian',
        address: 'Mumbai, India',
        issuingAuthority: 'UIDAI',
        issuanceDate: '2012-03-15',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_in_2',
        mrz: null,
        barcodeData: 'barcode_in_2',
        additionalNotes: ''
      },
      'AADHAAR-456789012345': {
        country: 'India',
        documentType: 'aadhaar',
        idNumber: '456789012345',
        fullName: 'Amit Patel',
        givenName: 'Amit',
        familyName: 'Patel',
        dateOfBirth: '1978-12-25',
        gender: 'male',
        nationality: 'Indian',
        address: 'Ahmedabad, India',
        issuingAuthority: 'UIDAI',
        issuanceDate: '2015-10-05',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_in_3',
        mrz: null,
        barcodeData: 'barcode_in_3',
        additionalNotes: ''
      }
    },
    "Canada": {
      'SIN-123456789': {
        country: 'Canada',
        documentType: 'sin',
        idNumber: '123456789',
        fullName: 'Emily Clark',
        givenName: 'Emily',
        familyName: 'Clark',
        dateOfBirth: '1982-06-18',
        gender: 'female',
        nationality: 'Canadian',
        address: 'Toronto, Canada',
        issuingAuthority: 'Service Canada',
        issuanceDate: '2000-09-01',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_ca_1',
        mrz: null,
        barcodeData: 'barcode_ca_1',
        additionalNotes: ''
      },
      'SIN-987654321': {
        country: 'Canada',
        documentType: 'sin',
        idNumber: '987654321',
        fullName: 'Lucas Martin',
        givenName: 'Lucas',
        familyName: 'Martin',
        dateOfBirth: '1995-11-02',
        gender: 'male',
        nationality: 'Canadian',
        address: 'Vancouver, Canada',
        issuingAuthority: 'Service Canada',
        issuanceDate: '2015-04-10',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_ca_2',
        mrz: null,
        barcodeData: 'barcode_ca_2',
        additionalNotes: ''
      },
      'SIN-555666777': {
        country: 'Canada',
        documentType: 'sin',
        idNumber: '555666777',
        fullName: 'Sophie Tremblay',
        givenName: 'Sophie',
        familyName: 'Tremblay',
        dateOfBirth: '1988-03-14',
        gender: 'female',
        nationality: 'Canadian',
        address: 'Montreal, Canada',
        issuingAuthority: 'Service Canada',
        issuanceDate: '2008-12-20',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_ca_3',
        mrz: null,
        barcodeData: 'barcode_ca_3',
        additionalNotes: ''
      }
    },
    "United Kingdom (UK)": {
      'NINO-AB123456C': {
        country: 'United Kingdom (UK)',
        documentType: 'nino',
        idNumber: 'AB123456C',
        fullName: 'Oliver Brown',
        givenName: 'Oliver',
        familyName: 'Brown',
        dateOfBirth: '1984-08-09',
        gender: 'male',
        nationality: 'British',
        address: 'London, UK',
        issuingAuthority: 'HM Revenue & Customs',
        issuanceDate: '2002-05-15',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_uk_1',
        mrz: null,
        barcodeData: 'barcode_uk_1',
        additionalNotes: ''
      },
      'NINO-CD654321A': {
        country: 'United Kingdom (UK)',
        documentType: 'nino',
        idNumber: 'CD654321A',
        fullName: 'Charlotte Evans',
        givenName: 'Charlotte',
        familyName: 'Evans',
        dateOfBirth: '1991-12-17',
        gender: 'female',
        nationality: 'British',
        address: 'Manchester, UK',
        issuingAuthority: 'HM Revenue & Customs',
        issuanceDate: '2011-07-22',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_uk_2',
        mrz: null,
        barcodeData: 'barcode_uk_2',
        additionalNotes: ''
      },
      'NINO-EF987654B': {
        country: 'United Kingdom (UK)',
        documentType: 'nino',
        idNumber: 'EF987654B',
        fullName: 'James Wilson',
        givenName: 'James',
        familyName: 'Wilson',
        dateOfBirth: '1979-05-23',
        gender: 'male',
        nationality: 'British',
        address: 'Birmingham, UK',
        issuingAuthority: 'HM Revenue & Customs',
        issuanceDate: '1999-10-30',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_uk_3',
        mrz: null,
        barcodeData: 'barcode_uk_3',
        additionalNotes: ''
      }
    },
    "China": {
      'CHN-11010519491231002X': {
        country: 'China',
        documentType: 'resident_id',
        idNumber: '11010519491231002X',
        fullName: 'Li Wei',
        givenName: 'Wei',
        familyName: 'Li',
        dateOfBirth: '1949-12-31',
        gender: 'male',
        nationality: 'Chinese',
        address: 'Beijing, China',
        issuingAuthority: 'Ministry of Public Security',
        issuanceDate: '1970-01-01',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_cn_1',
        mrz: null,
        barcodeData: 'barcode_cn_1',
        additionalNotes: ''
      },
      'CHN-320311770706001': {
        country: 'China',
        documentType: 'resident_id',
        idNumber: '320311770706001',
        fullName: 'Wang Fang',
        givenName: 'Fang',
        familyName: 'Wang',
        dateOfBirth: '1977-07-06',
        gender: 'female',
        nationality: 'Chinese',
        address: 'Shanghai, China',
        issuingAuthority: 'Ministry of Public Security',
        issuanceDate: '1995-03-12',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_cn_2',
        mrz: null,
        barcodeData: 'barcode_cn_2',
        additionalNotes: ''
      },
      'CHN-440524188001010014': {
        country: 'China',
        documentType: 'resident_id',
        idNumber: '440524188001010014',
        fullName: 'Zhang Yong',
        givenName: 'Yong',
        familyName: 'Zhang',
        dateOfBirth: '1980-01-01',
        gender: 'male',
        nationality: 'Chinese',
        address: 'Guangzhou, China',
        issuingAuthority: 'Ministry of Public Security',
        issuanceDate: '2000-06-18',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_cn_3',
        mrz: null,
        barcodeData: 'barcode_cn_3',
        additionalNotes: ''
      }
    },
    "Japan": {
      'MYNUMBER-123456789012': {
        country: 'Japan',
        documentType: 'my_number',
        idNumber: '123456789012',
        fullName: 'Satoshi Nakamoto',
        givenName: 'Satoshi',
        familyName: 'Nakamoto',
        dateOfBirth: '1975-04-05',
        gender: 'male',
        nationality: 'Japanese',
        address: 'Tokyo, Japan',
        issuingAuthority: 'Japan Agency for Local Authority Information Systems',
        issuanceDate: '2015-01-01',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_jp_1',
        mrz: null,
        barcodeData: 'barcode_jp_1',
        additionalNotes: ''
      },
      'MYNUMBER-234567890123': {
        country: 'Japan',
        documentType: 'my_number',
        idNumber: '234567890123',
        fullName: 'Yuki Tanaka',
        givenName: 'Yuki',
        familyName: 'Tanaka',
        dateOfBirth: '1988-09-12',
        gender: 'female',
        nationality: 'Japanese',
        address: 'Osaka, Japan',
        issuingAuthority: 'Japan Agency for Local Authority Information Systems',
        issuanceDate: '2016-03-10',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_jp_2',
        mrz: null,
        barcodeData: 'barcode_jp_2',
        additionalNotes: ''
      },
      'MYNUMBER-345678901234': {
        country: 'Japan',
        documentType: 'my_number',
        idNumber: '345678901234',
        fullName: 'Haruto Suzuki',
        givenName: 'Haruto',
        familyName: 'Suzuki',
        dateOfBirth: '1992-11-20',
        gender: 'male',
        nationality: 'Japanese',
        address: 'Nagoya, Japan',
        issuingAuthority: 'Japan Agency for Local Authority Information Systems',
        issuanceDate: '2017-07-25',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_jp_3',
        mrz: null,
        barcodeData: 'barcode_jp_3',
        additionalNotes: ''
      }
    },
    "Germany": {
      'GER-ID-ABC1234567': {
        country: 'Germany',
        documentType: 'id_card',
        idNumber: 'ABC1234567',
        fullName: 'Max Müller',
        givenName: 'Max',
        familyName: 'Müller',
        dateOfBirth: '1983-02-14',
        gender: 'male',
        nationality: 'German',
        address: 'Berlin, Germany',
        issuingAuthority: 'Bundesministerium des Innern',
        issuanceDate: '2003-05-10',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_de_1',
        mrz: null,
        barcodeData: 'barcode_de_1',
        additionalNotes: ''
      },
      'GER-ID-XYZ9876543': {
        country: 'Germany',
        documentType: 'id_card',
        idNumber: 'XYZ9876543',
        fullName: 'Anna Schmidt',
        givenName: 'Anna',
        familyName: 'Schmidt',
        dateOfBirth: '1990-10-05',
        gender: 'female',
        nationality: 'German',
        address: 'Munich, Germany',
        issuingAuthority: 'Bundesministerium des Innern',
        issuanceDate: '2010-12-01',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_de_2',
        mrz: null,
        barcodeData: 'barcode_de_2',
        additionalNotes: ''
      },
      'GER-ID-DEF4567890': {
        country: 'Germany',
        documentType: 'id_card',
        idNumber: 'DEF4567890',
        fullName: 'Lukas Fischer',
        givenName: 'Lukas',
        familyName: 'Fischer',
        dateOfBirth: '1987-07-19',
        gender: 'male',
        nationality: 'German',
        address: 'Hamburg, Germany',
        issuingAuthority: 'Bundesministerium des Innern',
        issuanceDate: '2007-09-15',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_de_3',
        mrz: null,
        barcodeData: 'barcode_de_3',
        additionalNotes: ''
      }
    },
    "France": {
      'FRA-ID-123456789': {
        country: 'France',
        documentType: 'cni',
        idNumber: '123456789',
        fullName: 'Jean Dupont',
        givenName: 'Jean',
        familyName: 'Dupont',
        dateOfBirth: '1985-03-12',
        gender: 'male',
        nationality: 'French',
        address: 'Paris, France',
        issuingAuthority: 'Ministère de l’Intérieur',
        issuanceDate: '2005-06-20',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_fr_1',
        mrz: null,
        barcodeData: 'barcode_fr_1',
        additionalNotes: ''
      },
      'FRA-ID-987654321': {
        country: 'France',
        documentType: 'cni',
        idNumber: '987654321',
        fullName: 'Marie Dubois',
        givenName: 'Marie',
        familyName: 'Dubois',
        dateOfBirth: '1992-08-25',
        gender: 'female',
        nationality: 'French',
        address: 'Lyon, France',
        issuingAuthority: 'Ministère de l’Intérieur',
        issuanceDate: '2012-11-10',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_fr_2',
        mrz: null,
        barcodeData: 'barcode_fr_2',
        additionalNotes: ''
      },
      'FRA-ID-555666777': {
        country: 'France',
        documentType: 'cni',
        idNumber: '555666777',
        fullName: 'Pierre Martin',
        givenName: 'Pierre',
        familyName: 'Martin',
        dateOfBirth: '1980-01-30',
        gender: 'male',
        nationality: 'French',
        address: 'Marseille, France',
        issuingAuthority: 'Ministère de l’Intérieur',
        issuanceDate: '2000-04-18',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_fr_3',
        mrz: null,
        barcodeData: 'barcode_fr_3',
        additionalNotes: ''
      }
    },
    "Brazil": {
      'CPF-12345678901': {
        country: 'Brazil',
        documentType: 'cpf',
        idNumber: '12345678901',
        fullName: 'Carlos Silva',
        givenName: 'Carlos',
        familyName: 'Silva',
        dateOfBirth: '1986-05-14',
        gender: 'male',
        nationality: 'Brazilian',
        address: 'São Paulo, Brazil',
        issuingAuthority: 'Receita Federal',
        issuanceDate: '2006-08-22',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_br_1',
        mrz: null,
        barcodeData: 'barcode_br_1',
        additionalNotes: ''
      },
      'CPF-98765432100': {
        country: 'Brazil',
        documentType: 'cpf',
        idNumber: '98765432100',
        fullName: 'Ana Souza',
        givenName: 'Ana',
        familyName: 'Souza',
        dateOfBirth: '1993-10-09',
        gender: 'female',
        nationality: 'Brazilian',
        address: 'Rio de Janeiro, Brazil',
        issuingAuthority: 'Receita Federal',
        issuanceDate: '2013-02-14',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_br_2',
        mrz: null,
        barcodeData: 'barcode_br_2',
        additionalNotes: ''
      },
      'CPF-55566677788': {
        country: 'Brazil',
        documentType: 'cpf',
        idNumber: '55566677788',
        fullName: 'Bruno Oliveira',
        givenName: 'Bruno',
        familyName: 'Oliveira',
        dateOfBirth: '1981-03-27',
        gender: 'male',
        nationality: 'Brazilian',
        address: 'Brasília, Brazil',
        issuingAuthority: 'Receita Federal',
        issuanceDate: '2001-07-19',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_br_3',
        mrz: null,
        barcodeData: 'barcode_br_3',
        additionalNotes: ''
      }
    },
    "Australia": {
      'TFN-123456789': {
        country: 'Australia',
        documentType: 'tfn',
        idNumber: '123456789',
        fullName: 'Jack Wilson',
        givenName: 'Jack',
        familyName: 'Wilson',
        dateOfBirth: '1987-09-11',
        gender: 'male',
        nationality: 'Australian',
        address: 'Sydney, Australia',
        issuingAuthority: 'Australian Taxation Office',
        issuanceDate: '2007-12-01',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_au_1',
        mrz: null,
        barcodeData: 'barcode_au_1',
        additionalNotes: ''
      },
      'TFN-987654321': {
        country: 'Australia',
        documentType: 'tfn',
        idNumber: '987654321',
        fullName: 'Olivia Brown',
        givenName: 'Olivia',
        familyName: 'Brown',
        dateOfBirth: '1994-02-28',
        gender: 'female',
        nationality: 'Australian',
        address: 'Melbourne, Australia',
        issuingAuthority: 'Australian Taxation Office',
        issuanceDate: '2014-06-15',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_au_2',
        mrz: null,
        barcodeData: 'barcode_au_2',
        additionalNotes: ''
      },
      'TFN-555666777': {
        country: 'Australia',
        documentType: 'tfn',
        idNumber: '555666777',
        fullName: 'William Smith',
        givenName: 'William',
        familyName: 'Smith',
        dateOfBirth: '1982-05-06',
        gender: 'male',
        nationality: 'Australian',
        address: 'Brisbane, Australia',
        issuingAuthority: 'Australian Taxation Office',
        issuanceDate: '2002-09-23',
        expiryDate: null,
        photoReference: '',
        biometricHash: 'hash_au_3',
        mrz: null,
        barcodeData: 'barcode_au_3',
        additionalNotes: ''
      }
    }
};

const govIdFields = [
    { key: 'country', description: 'Country issuing the ID' },
    { key: 'documentType', description: 'Type of document (e.g., national ID, passport, driver_license)' },
    { key: 'idNumber', description: 'Unique government-issued identifier' },
    { key: 'fullName', description: 'Full name as printed on the ID' },
    { key: 'givenName', description: 'Given/first name(s)' },
    { key: 'familyName', description: 'Surname/family name' },
    { key: 'dateOfBirth', description: 'Date of birth (YYYY-MM-DD)' },
    { key: 'gender', description: 'Gender/sex as recorded' },
    { key: 'nationality', description: 'Nationality' },
    { key: 'address', description: 'Address (may be partial or full)' },
    { key: 'issuingAuthority', description: 'Issuing authority/agency' },
    { key: 'issuanceDate', description: 'Date of issue' },
    { key: 'expiryDate', description: 'Date of expiry (if applicable)' },
    { key: 'photoReference', description: 'Photo path, URL, or reference ID' },
    { key: 'biometricHash', description: 'Optional biometric hash/fingerprint template' },
    { key: 'mrz', description: 'Machine-readable zone (for passports)' },
    { key: 'barcodeData', description: 'Barcode/QR data on card/document' },
    { key: 'additionalNotes', description: 'Any other notes, flags or verification metadata' }
];

// Lightweight schema for gov ID records (used for validation / form generation)
const govIdSchema = {
    type: 'object',
    required: ['country', 'documentType', 'idNumber', 'fullName', 'dateOfBirth'],
    properties: {
        country: { type: 'string' },
        documentType: { type: 'string' },
        idNumber: { type: 'string' },
        fullName: { type: 'string' },
        givenName: { type: 'string' },
        familyName: { type: 'string' },
        dateOfBirth: { type: 'string', format: 'date' }, // YYYY-MM-DD
        gender: { type: 'string' },
        nationality: { type: 'string' },
        address: { type: 'string' },
        issuingAuthority: { type: 'string' },
        issuanceDate: { type: 'string', format: 'date' },
        expiryDate: { type: ['string', 'null'], format: 'date' },
        photoReference: { type: ['string', 'null'] },
        biometricHash: { type: ['string', 'null'] },
        mrz: { type: ['string', 'null'] },
        barcodeData: { type: ['string', 'null'] },
        additionalNotes: { type: ['string', 'null'] }
    }
};

// Simple validator that checks presence of required fields and basic date format
function validateGovId(record) {
    const errors = [];
    if (!record || typeof record !== 'object') {
        return { valid: false, errors: ['record must be an object'] };
    }

    // required fields
    (govIdSchema.required || []).forEach((key) => {
        if (!(key in record) || record[key] === undefined || record[key] === null || record[key] === '') {
            errors.push(`missing required field: ${key}`);
        }
    });

    // basic date format check (YYYY-MM-DD) for relevant fields
    const dateFields = ['dateOfBirth', 'issuanceDate', 'expiryDate'];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    dateFields.forEach((f) => {
        if (f in record && record[f] !== null && record[f] !== undefined && record[f] !== '') {
            if (typeof record[f] !== 'string' || !dateRegex.test(record[f])) {
                errors.push(`invalid date format for ${f}, expected YYYY-MM-DD`);
            }
        }
    });

    return { valid: errors.length === 0, errors };
}

// load reference photos from ./reference_photos and attach as data URLs to matching records
function loadReferencePhotos() {
  try {
    const photosDir = path.join(__dirname, 'reference_photos');
    if (!fs.existsSync(photosDir)) return;
    const files = fs.readdirSync(photosDir);

    for (const file of files) {
      const match = file.match(/^([A-Za-z]+)[_-](.+)\.(jpg|jpeg|png)$/i);
      if (!match) continue;

      const [, rawCountry, rawId] = match;
      const country = normalizeCountryKey(rawCountry);
      const fullPath = path.join(photosDir, file);

      if (!country || !govMockDB[country]) continue;

      // try exact id match first, then look for any key that endsWith or includes the rawId
      let targetKey = null;
      if (govMockDB[country][rawId]) {
        targetKey = rawId;
      } else {
        targetKey = Object.keys(govMockDB[country]).find(k =>
          k.toLowerCase() === rawId.toLowerCase() ||
          k.toLowerCase().endsWith(rawId.toLowerCase()) ||
          k.toLowerCase().includes(rawId.toLowerCase())
        );
      }

      if (targetKey) {
        const data = fs.readFileSync(fullPath);
        const ext = path.extname(file).slice(1).toLowerCase();
        const base64 = data.toString('base64');
        const dataUrl = `data:image/${ext};base64,${base64}`;
        govMockDB[country][targetKey].photoReference = dataUrl;
        console.log(`Loaded reference photo for ${country}/${targetKey}`);
      }
    }
  } catch (e) {
    console.warn('Error reading reference_photos directory', e);
  }
}

// Immediately load photos when the module is imported
loadReferencePhotos();

// New: normalize country key (case-insensitive)
function normalizeCountryKey(country) {
  if (!country || typeof country !== 'string') return country;
  // Keep original capitalization used in the DB (e.g., "Nigeria", "Ghana")
  const found = Object.keys(govMockDB).find(k => k.toLowerCase() === country.toLowerCase());
  return found || country;
}

function ensureCountryExists(country) {
  const key = normalizeCountryKey(country) || country;
  if (!govMockDB[key]) govMockDB[key] = {};
  return key;
}

function generateIdNumber(country) {
  const prefix = (country && country.slice(0,3).toUpperCase()) || 'ID';
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// Add a new record (validates required fields). Returns the stored record or throws an Error.
function addGovRecord(country, record) {
  const key = ensureCountryExists(country);
  const rec = Object.assign({}, record);
  if (!rec.idNumber) rec.idNumber = generateIdNumber(key);
  const id = rec.idNumber;

  if (govMockDB[key][id]) {
    throw new Error(`record with idNumber ${id} already exists in ${key}`);
  }

  const validation = validateGovId(rec);
  if (!validation.valid) {
    throw new Error(`validation failed: ${validation.errors.join('; ')}`);
  }

  govMockDB[key][id] = rec;
  return govMockDB[key][id];
}

// Update an existing record (partial). Returns updated record or null if not found.
function updateGovRecord(country, idNumber, updates) {
  const key = normalizeCountryKey(country);
  if (!key || !govMockDB[key] || !govMockDB[key][idNumber]) return null;

  const updated = Object.assign({}, govMockDB[key][idNumber], updates);
  const validation = validateGovId(updated);
  if (!validation.valid) {
    throw new Error(`validation failed: ${validation.errors.join('; ')}`);
  }

  govMockDB[key][idNumber] = updated;
  return updated;
}

// Delete a record. Returns true if removed, false if not found.
function deleteGovRecord(country, idNumber) {
  const key = normalizeCountryKey(country);
  if (!key || !govMockDB[key] || !govMockDB[key][idNumber]) return false;
  delete govMockDB[key][idNumber];
  return true;
}

// Search records by query string across fields. If country omitted, searches all countries.
function searchGovRecords(query, country) {
  if (!query || typeof query !== 'string') return [];
  const q = query.toLowerCase();
  const results = [];

  const countryKeys = country ? [normalizeCountryKey(country)] : Object.keys(govMockDB);
  countryKeys.forEach((ck) => {
    if (!ck || !govMockDB[ck]) return;
    Object.values(govMockDB[ck]).forEach((rec) => {
      for (const v of Object.values(rec)) {
        if (v == null) continue;
        if (typeof v === 'string' && v.toLowerCase().includes(q)) {
          results.push(rec);
          return;
        }
      }
    });
  });

  return results;
}

// Persistence helpers: save to JSON and load from JSON (overwrites in-memory DB)
function saveMockDB(filePath) {
  const out = filePath || path.join(__dirname, 'govMockDB.json');
  try {
    fs.writeFileSync(out, JSON.stringify(govMockDB, null, 2), 'utf8');
    return out;
  } catch (e) {
    throw new Error(`failed to save mock DB: ${e.message}`);
  }
}

function loadMockDB(filePath) {
  const inPath = filePath || path.join(__dirname, 'govMockDB.json');
  if (!fs.existsSync(inPath)) {
    throw new Error(`file not found: ${inPath}`);
  }
  const raw = fs.readFileSync(inPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error('invalid JSON in mock DB file');
  }

  // Replace contents of govMockDB while keeping the same object reference
  Object.keys(govMockDB).forEach(k => delete govMockDB[k]);
  Object.keys(parsed).forEach(k => { govMockDB[k] = parsed[k]; });
  // reload photos after loading new data
  loadReferencePhotos();
  return true;
}

// Ensure a govLookup helper is defined and exported.
// Looks up a record by country (flexible key) and idNumber, returns the record or null.
function govLookup(country, idNumber) {
  if (!country || !idNumber) return null;
  const key = (typeof normalizeCountryKey === 'function') ? normalizeCountryKey(country) : country;
  if (!key || !govMockDB[key]) return null;

  const raw = String(idNumber).trim();

  // generate candidate id forms to try
  const candidates = new Set();

  // original input
  candidates.add(raw);

  // alphanumeric only (strip non-alnum)
  const alnum = raw.replace(/[^A-Za-z0-9]/g, '');
  if (alnum) candidates.add(alnum);

  // prefix (first 3 letters of country name) normalized
  const prefix = (key && String(key).slice(0,3).toUpperCase()) || null;
  if (prefix) {
    // if raw already has prefix (with or without dash), normalize to "XXX-..."
    const rePrefix = new RegExp(`^${prefix}-?`, 'i');
    if (rePrefix.test(raw)) {
      const remainder = raw.replace(rePrefix, '');
      const normalizedWithDash = `${prefix}-${remainder.replace(/[^A-Za-z0-9]/g,'')}`;
      candidates.add(normalizedWithDash);
      candidates.add(`${prefix}${remainder}`); // without dash
      candidates.add(remainder);
    } else {
      // try adding prefix variants
      candidates.add(`${prefix}-${raw}`);
      candidates.add(`${prefix}${raw}`);
      if (alnum) {
        candidates.add(`${prefix}-${alnum}`);
        candidates.add(`${prefix}${alnum}`);
      }
    }
  }

  // also try lower/upper variants
  Array.from(candidates).forEach(c => {
    candidates.add(String(c).toUpperCase());
    candidates.add(String(c).toLowerCase());
  });

  // try exact matches first
  for (const cand of candidates) {
    if (govMockDB[key][cand]) return govMockDB[key][cand];
  }

  // fallback: find any key that includes the numeric portion (useful if stored with prefix)
  const numeric = alnum;
  if (numeric) {
    const foundKey = Object.keys(govMockDB[key]).find(k =>
      k.replace(/[^A-Za-z0-9]/g,'').toLowerCase().endsWith(numeric.toLowerCase())
    );
    if (foundKey) return govMockDB[key][foundKey];
  }

  return null;
}

// Export existing and new helpers
module.exports = {
  govMockDB,
  govIdFields,
  govIdSchema,
  validateGovId,
  govLookup,
  // new exports
  normalizeCountryKey,
  addGovRecord,
  updateGovRecord,
  deleteGovRecord,
  searchGovRecords,
  saveMockDB,
  loadMockDB
};
