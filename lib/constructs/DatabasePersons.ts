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

    // GSI1: For listing all entities by type
    // Pattern: gsi1pk = "PERSONS" | "ADDRESSES" | "BANKACCOUNTS" | "CONTACTS" | "EMPLOYMENTS"
    // This single GSI handles all "get all entities of type X" queries
    this.dbPersons.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'gsi1pk', type: AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
  }
}
