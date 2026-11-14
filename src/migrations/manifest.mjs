// Append only. Existing identities and LF-normalized source digests are immutable.
export const migrationManifest = [
  {
    "file": "1689500000000-Init.ts",
    "name": "Init1689500000000",
    "timestamp": 1689500000000,
    "sha256": "fdfc80eb6664a1d6475fe5a7ba3640edad1adaa2b57ecc5d686a22f6d56a5147",
    "after": [],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000001-AddOrgAuditOrdersInvoices.ts",
    "name": "AddOrgAuditOrdersInvoices1689500000001",
    "timestamp": 1689500000001,
    "sha256": "241d8941da69920eb2aa3ec1196fa607049b0bfdb99ca95439f006007424a9c5",
    "after": [
      "Init1689500000000"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000002-SeedDefaultOrganization.ts",
    "name": "SeedDefaultOrganization1689500000002",
    "timestamp": 1689500000002,
    "sha256": "81469e4cbf995b44771f79bfef3910282cebc15c6b9d2c38a605afa0a351153d",
    "after": [
      "AddOrgAuditOrdersInvoices1689500000001"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000003-AlignEntitiesAndSchema.ts",
    "name": "AlignEntitiesAndSchema1689500000003",
    "timestamp": 1689500000003,
    "sha256": "b1b4316e838187e4397f6be22070829c0b2078d664a30bd209d9386b6622d25f",
    "after": [
      "SeedDefaultOrganization1689500000002"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000004-CleanSchemaAlignment.ts",
    "name": "CleanSchemaAlignment1689500000004",
    "timestamp": 1689500000004,
    "sha256": "d2b20642d42de11fa86012d336dcdcc9dec03129991f8ce8282ae6ea18843884",
    "after": [
      "AlignEntitiesAndSchema1689500000003"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000005-FinalSchemaReconciliation.ts",
    "name": "FinalSchemaReconciliation1689500000005",
    "timestamp": 1689500000005,
    "sha256": "d56f59819cecd7be1a74a8a11a4217ef5045f68d1ed03717ae8199ffada9de16",
    "after": [
      "CleanSchemaAlignment1689500000004"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000006-SeedAdminUser.ts",
    "name": "SeedAdminUser1689500000006",
    "timestamp": 1689500000006,
    "sha256": "f5a9bd7351228ec2171525e5ec00cb22ed3692e1bd8b23cadc5ac15603ed4936",
    "after": [
      "FinalSchemaReconciliation1689500000005"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000007-AddVisualWarehouseAndSerialNumbers.ts",
    "name": "AddVisualWarehouseAndSerialNumbers1689500000007",
    "timestamp": 1689500000007,
    "sha256": "7801d89197f1d1847cd932b35314804bbc420df28ff830dfd3f81bc413126b6a",
    "after": [
      "SeedAdminUser1689500000006"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000007-ProductionReconciliation.ts",
    "name": "ProductionReconciliation1689500000007",
    "timestamp": 1689500000007,
    "sha256": "a8e06b609c600772913980f5eb445c807173868a6b1c696048ac99692d8deb0c",
    "after": [
      "AddVisualWarehouseAndSerialNumbers1689500000007"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000008-AddStockLedgerAndWmsOps.ts",
    "name": "AddStockLedgerAndWmsOps1689500000008",
    "timestamp": 1689500000008,
    "sha256": "e113ad3fed223ece95f8159b389566e09a85414c084ba79061b2ebc7b3fa5381",
    "after": [
      "ProductionReconciliation1689500000007"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000009-AddRbacAndSessions.ts",
    "name": "AddRbacAndSessions1689500000009",
    "timestamp": 1689500000009,
    "sha256": "5819acb6c3b51d4b54449413984933424d48d41b8603ea9ef3972d5597b0ab8c",
    "after": [
      "AddStockLedgerAndWmsOps1689500000008"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000010-EnterpriseMultiLocationAndAuditCore.ts",
    "name": "EnterpriseMultiLocationAndAuditCore1689500000010",
    "timestamp": 1689500000010,
    "sha256": "b832520eb578ece04dd48714a8815d70a253f1ea646d9c3c1b00c164a7f99ca6",
    "after": [
      "AddRbacAndSessions1689500000009"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000011-AddQmsAndESignatures.ts",
    "name": "AddQmsAndESignatures1689500000011",
    "timestamp": 1689500000011,
    "sha256": "6a13b2a0a7752e5c041633c16b83798d916886a973d2f9e9578158785b7e6243",
    "after": [
      "EnterpriseMultiLocationAndAuditCore1689500000010"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000012-AddOrderFulfillmentFields.ts",
    "name": "AddOrderFulfillmentFields1689500000012",
    "timestamp": 1689500000012,
    "sha256": "4596cdfa87206d66b5a82572a6d772e29b68c40479f44d894671f41695ca810f",
    "after": [
      "AddQmsAndESignatures1689500000011"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000013-AddHardwareElectronicsBOM.ts",
    "name": "AddHardwareElectronicsBOM1689500000013",
    "timestamp": 1689500000013,
    "sha256": "45453a2cbc931aeaeded8d48c8eed6691236c5724d7d496e97aa8b439dedb2da",
    "after": [
      "AddOrderFulfillmentFields1689500000012"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000014-AddStockIntegrityAndSpatialTree.ts",
    "name": "AddStockIntegrityAndSpatialTree1689500000014",
    "timestamp": 1689500000014,
    "sha256": "36868fcf874ba024831daf1da6cebafc6dbd522506981bcbf1dc200ffaa459f3",
    "after": [
      "AddHardwareElectronicsBOM1689500000013"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1689500000015-AddReservedQuantity.ts",
    "name": "AddReservedQuantity1689500000015",
    "timestamp": 1689500000015,
    "sha256": "ffbae894ba48486e02c5e62845c0c1371583e407cfd2acb8fa4a1ed3187bebb5",
    "after": [
      "AddStockIntegrityAndSpatialTree1689500000014"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1791417600000-AddProductTemplates.ts",
    "name": "AddProductTemplates1791417600000",
    "timestamp": 1791417600000,
    "sha256": "01af9c472f8c2298bdf47e3d09728ec898848cc0ddf30bef4e3dbb136b4d5296",
    "after": [
      "AddReservedQuantity1689500000015"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1791417600001-AddKitSubjectsAndGrades.ts",
    "name": "AddKitSubjectsAndGrades1791417600001",
    "timestamp": 1791417600001,
    "sha256": "a7f4f184dba9415a4061e4944a7ab5503a1af519ead43e0c8c6f2af0f0ba5f00",
    "after": [
      "AddProductTemplates1791417600000"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1791417600002-AddProjectPlanning.ts",
    "name": "AddProjectPlanning1791417600002",
    "timestamp": 1791417600002,
    "sha256": "19a27c75b86f01ab6ecf28e2d946b4321767f47261608cc7ab514eb27e07c91c",
    "after": [
      "AddKitSubjectsAndGrades1791417600001"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1791504000003-AddPhysicalStocktake.ts",
    "name": "AddPhysicalStocktake1791504000003",
    "timestamp": 1791504000003,
    "sha256": "069383099945d2cd086dc14e95628ac39e38ac381efbb84485135003122e6693",
    "after": [
      "AddProjectPlanning1791417600002"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1791676800004-AddReservationsAndProcurement.ts",
    "name": "AddReservationsAndProcurement1791676800004",
    "timestamp": 1791676800004,
    "sha256": "791cf12993ef7174fc0d38d684d5f28fe4f0b5492366b47adf175e54e597122e",
    "after": [
      "AddPhysicalStocktake1791504000003"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1791763200005-AddProductionPlanning.ts",
    "name": "AddProductionPlanning1791763200005",
    "timestamp": 1791763200005,
    "sha256": "ca71f30b350b371fd8ab7f403944bc74aaa8c4ea6b856be5dcafea4d046c8f91",
    "after": [
      "AddReservationsAndProcurement1791676800004"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1791763200006-HardenProductionReconciliation.ts",
    "name": "HardenProductionReconciliation1791763200006",
    "timestamp": 1791763200006,
    "sha256": "389cc209d16016777328c39ca4dcdd37d51c5c9c00ac81366808cf9c9af97daf",
    "after": [
      "AddProductionPlanning1791763200005"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1791849600007-AddPacking.ts",
    "name": "AddPacking1791849600007",
    "timestamp": 1791849600007,
    "sha256": "c262945615d542090990fd47dca85a8ef5d781a8da97c84b04e9b953f1f5df15",
    "after": [
      "HardenProductionReconciliation1791763200006"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1791936000008-HardenPackingReadiness.ts",
    "name": "HardenPackingReadiness1791936000008",
    "timestamp": 1791936000008,
    "sha256": "6761a795a78da7342ac265f39bbc0e3546bb0adc345e9e117f2ff3fa64651d1d",
    "after": [
      "AddPacking1791849600007"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792022400009-AddDeliveryCustody.ts",
    "name": "AddDeliveryCustody1792022400009",
    "timestamp": 1792022400009,
    "sha256": "14a898dca9e4eae9da5c7c64259b101037015da566db901bc9cca7c2cd3f9638",
    "after": [
      "HardenPackingReadiness1791936000008"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792108800010-AddProjectCompletion.ts",
    "name": "AddProjectCompletion1792108800010",
    "timestamp": 1792108800010,
    "sha256": "477ce29be6fdfa7a0513e3db2beaa37f2d241bf3874089289f42cd43857b9636",
    "after": [
      "AddDeliveryCustody1792022400009"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792195200011-AddPrivateAttachments.ts",
    "name": "AddPrivateAttachments1792195200011",
    "timestamp": 1792195200011,
    "sha256": "c11d281463a77e564ae542ecc758ef25471fab98461a9380df144ddae7fbb2f8",
    "after": [
      "AddProjectCompletion1792108800010"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792281600012-AddSharedLabelLayouts.ts",
    "name": "AddSharedLabelLayouts1792281600012",
    "timestamp": 1792281600012,
    "sha256": "843c9dfbd9f31fe7ed223aa6ead494b2c27dcaef824d24b7e8046173f2ea1c32",
    "after": [
      "AddPrivateAttachments1792195200011"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792368000013-AddRequirementApproval.ts",
    "name": "AddRequirementApproval1792368000013",
    "timestamp": 1792368000013,
    "sha256": "36dd0513cfc00e0bf1e2f5e14cf70bf24429e00001ddaf9946576be1e506d9fe",
    "after": [
      "AddSharedLabelLayouts1792281600012"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792454400014-HardenApprovedPackingDemand.ts",
    "name": "HardenApprovedPackingDemand1792454400014",
    "timestamp": 1792454400014,
    "sha256": "d32d31e9fe34420625987a79c9e0fbb4609bad9d4d94823f2a27003418d5ed46",
    "after": [
      "AddRequirementApproval1792368000013"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792540800015-AddCommitmentLedger.ts",
    "name": "AddCommitmentLedger1792540800015",
    "timestamp": 1792540800015,
    "sha256": "f3032d61547eb91f5f6c251987da8ac929b25e2d623e3b734b12cb21721a5023",
    "after": [
      "HardenApprovedPackingDemand1792454400014"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792540800016-HardenCommitmentEventEvidence.ts",
    "name": "HardenCommitmentEventEvidence1792540800016",
    "timestamp": 1792540800016,
    "sha256": "bfeedbf1329f006707331196572a1de3719f0b463bef751255b57c38c213ee04",
    "after": [
      "AddCommitmentLedger1792540800015"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792540800017-AddLedgerCapabilities.ts",
    "name": "AddLedgerCapabilities1792540800017",
    "timestamp": 1792540800017,
    "sha256": "fb0f0498e96cd5fc9b4db937115df4894b150db12cca2de69e57a8c904f45142",
    "after": [
      "HardenCommitmentEventEvidence1792540800016"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1792540800018-AddReservationCommitments.ts",
    "name": "AddReservationCommitments1792540800018",
    "timestamp": 1792540800018,
    "sha256": "d1cbce028fcbb87ea08fe30fa46a42db830247483fa2aa93d7b65a65ea49f2d9",
    "after": [
      "AddLedgerCapabilities1792540800017"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1792627200019-AddPurchaseRequestCommitments.ts",
    "name": "AddPurchaseRequestCommitments1792627200019",
    "timestamp": 1792627200019,
    "sha256": "d4fc2a08d5d402f41e03a3e31dd49eaad05d9c5e17855ce59f8c1e315032e808",
    "after": [
      "AddReservationCommitments1792540800018"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1792713600020-AddPurchaseOrderCommitments.ts",
    "name": "AddPurchaseOrderCommitments1792713600020",
    "timestamp": 1792713600020,
    "sha256": "4a28f150c0220ede9c23b4d5878949f8d73bd24501c0a275fdac9b0e38863d96",
    "after": [
      "AddPurchaseRequestCommitments1792627200019"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1792800000021-AddReceiptCommitments.ts",
    "name": "AddReceiptCommitments1792800000021",
    "timestamp": 1792800000021,
    "sha256": "30e3a46899ef20b64833bca077a4ba3037b51d21af9a0982f82f5a1d8a034f92",
    "after": [
      "AddPurchaseOrderCommitments1792713600020"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1792886400022-BlockUnintegratedExecution.ts",
    "name": "BlockUnintegratedExecution1792886400022",
    "timestamp": 1792886400022,
    "sha256": "a706229a98f547df4c0c53534dff7d8652bb4beff7f3cd6e69114a9371906c45",
    "after": [
      "AddReceiptCommitments1792800000021"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1792972800023-TrustedRecipePublication.ts",
    "name": "TrustedRecipePublication1792972800023",
    "timestamp": 1792972800023,
    "sha256": "9118d2a16f0fc75b49b4b1f630e88755386c0df52abc7a9b6e1a16a3f61818da",
    "after": [
      "BlockUnintegratedExecution1792886400022"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1793059200024-TrustedWorkOrderAuthority.ts",
    "name": "TrustedWorkOrderAuthority1793059200024",
    "timestamp": 1793059200024,
    "sha256": "41135db458cda07c22b4f0454d14f1254b4981da257132f71177a6ce5442b6fa",
    "after": [
      "TrustedRecipePublication1792972800023"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1793059200025-AddFinishedOutputCustody.ts",
    "name": "AddFinishedOutputCustody1793059200025",
    "timestamp": 1793059200025,
    "sha256": "8fe36c2df2138e927d8853d225374a27c1f931451ccd40596dbc900d9daa301c",
    "after": [
      "TrustedWorkOrderAuthority1793059200024"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1793059200026-TrustedPackingCustody.ts",
    "name": "TrustedPackingCustody1793059200026",
    "timestamp": 1793059200026,
    "sha256": "6213c905b33eb7181e2fb4641023f6f9b34839d530e98c30b74a461905520ff2",
    "after": [
      "AddFinishedOutputCustody1793059200025"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1793145600027-TrustedDispatchCustody.ts",
    "name": "TrustedDispatchCustody1793145600027",
    "timestamp": 1793145600027,
    "sha256": "0401ea0ce13858262bd4a8c9dc7e7695a4751d7ab8839d76c4545f900fea53ed",
    "after": [
      "TrustedPackingCustody1793059200026"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1793145600028-TrustedProjectClosure.ts",
    "name": "TrustedProjectClosure1793145600028",
    "timestamp": 1793145600028,
    "sha256": "f3cecf3edd7ced3862531dd5ab83b8420572bf54c664f2b90eafd8235a68ea19",
    "after": [
      "TrustedDispatchCustody1793145600027"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1793232000029-HistoricalEvidenceDecisions.ts",
    "name": "HistoricalEvidenceDecisions1793232000029",
    "timestamp": 1793232000029,
    "sha256": "85a7bf8b6bcbf7119153db5bb119a990a4d2cbfc7dac0cbb40e85d405fc6b129",
    "after": [
      "TrustedProjectClosure1793145600028"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1793232000030-OperationalEvidence.ts",
    "name": "OperationalEvidence1793232000030",
    "timestamp": 1793232000030,
    "sha256": "40873abaf81c6d615e8131d9cee639b3b4f88852d20ca2c02ba38d03ea8107ef",
    "after": [
      "HistoricalEvidenceDecisions1793232000029"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1793232000031-AggregateWorkOrderDemand.ts",
    "name": "AggregateWorkOrderDemand1793232000031",
    "timestamp": 1793232000031,
    "sha256": "cc1fcc91db4506401fc6acdd006ab84f1c2593ab769bb3221261710348b2fd52",
    "after": [
      "OperationalEvidence1793232000030"
    ],
    "scope": "legacy-or-development"
  },
  {
    "file": "1793232000032-BlockResidualProjectHolds.ts",
    "name": "BlockResidualProjectHolds1793232000032",
    "timestamp": 1793232000032,
    "sha256": "508200873e4a9d9e483574e52cdba45488a78a54f6ceef04040accb3170e95a1",
    "after": [
      "AggregateWorkOrderDemand1793232000031"
    ],
    "scope": "synthetic-only"
  },
  {
    "file": "1793232000033-FabLabLoans.ts",
    "name": "FabLabLoans1793232000033",
    "timestamp": 1793232000033,
    "sha256": "e57f61c5ed919ed40fc624779c98ebcdddb41630e92f5346717bd846886aa77a",
    "after": ["BlockResidualProjectHolds1793232000032"],
    "runtimeAfter": [],
    "scope": "production-runtime"
  }
];
