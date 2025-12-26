import { AttributeType, BillingMode, ProjectionType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabasePersons extends Construct {
  public readonly dbPersons: Table;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.dbPersons = new Table(this, 'Persons', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // GSI1: For listing all persons
    // gsi1pk = "PERSONS", gsi1sk = "PERSON#<personId>"
    this.dbPersons.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'gsi1pk', type: AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // GSI2: For fetching ALL entities (for Orama search index)
    // gsi2pk = "ALL_DATA" (constant), gsi2sk = "PERSON#<personId>#<entityType>#<entityId>"
    this.dbPersons.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'gsi2pk', type: AttributeType.STRING },
      sortKey: { name: 'gsi2sk', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
  }
}
