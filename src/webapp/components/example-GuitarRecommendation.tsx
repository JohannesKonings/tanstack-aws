import { useNavigate } from '@tanstack/react-router';
import { Button } from '#src/webapp/components/ui/button';
import { Card } from '#src/webapp/components/ui/card';
import guitars from '../data/example-guitars';
import { showAIAssistant } from './example-AIAssistant';

export default function GuitarRecommendation({ id }: { id: string }) {
  const navigate = useNavigate();
  const guitar = guitars.find((guitar) => guitar.id === +id);
  if (!guitar) {
    return null;
  }
  return (
    <Card className="my-4 overflow-hidden border-border-default">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={guitar.image} alt={guitar.name} className="h-full w-full object-cover" />
      </div>
      <div className="p-4">
        <h3 className="mb-2 text-lg font-semibold text-text-primary">{guitar.name}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-text-secondary">{guitar.shortDescription}</p>
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-lib-start">${guitar.price}</div>
          <Button
            variant="gradient"
            color="orange"
            size="sm"
            onClick={() => {
              navigate({
                to: '/example/guitars/$guitarId',
                params: { guitarId: guitar.id.toString() },
              });
              showAIAssistant.setState(() => false);
            }}
          >
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
}
